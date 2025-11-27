const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class DatabaseBackup {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3301,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'little_idlegame'
        };
        
        this.backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async connect() {
        this.connection = await mysql.createConnection(this.config);
        console.log('✅ Connected to MySQL database');
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log('✅ Database connection closed');
        }
    }

    async backupTable(tableName) {
        console.log(`📦 Backing up table: ${tableName}`);
        
        const [rows] = await this.connection.execute(`SELECT * FROM ${tableName}`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${tableName}_${timestamp}.json`;
        const filepath = path.join(this.backupDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(rows, null, 2));
        console.log(`✅ Table ${tableName} backed up to: ${filename}`);
        
        return { tableName, filename, rows: rows.length };
    }

    async backupGiftCodes() {
        console.log('🎁 Creating Gift Codes backup...');
        
        const tables = ['gift_codes', 'gift_code_redemptions'];
        const results = [];
        
        for (const table of tables) {
            try {
                const result = await this.backupTable(table);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error backing up ${table}:`, error.message);
            }
        }
        
        // Create summary
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const summary = {
            backup_date: new Date().toISOString(),
            tables: results,
            total_tables: results.length,
            total_rows: results.reduce((sum, r) => sum + r.rows, 0)
        };
        
        const summaryFile = `backup_summary_${timestamp}.json`;
        fs.writeFileSync(path.join(this.backupDir, summaryFile), JSON.stringify(summary, null, 2));
        
        console.log('✅ Gift Codes backup completed!');
        console.log(`📄 Summary saved to: ${summaryFile}`);
        
        return summary;
    }

    async restoreTable(filename) {
        console.log(`📥 Restoring from: ${filename}`);
        
        const filepath = path.join(this.backupDir, filename);
        if (!fs.existsSync(filepath)) {
            throw new Error(`Backup file not found: ${filename}`);
        }
        
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const tableName = filename.split('_')[0];
        
        if (data.length === 0) {
            console.log(`⚠️  No data to restore for ${tableName}`);
            return;
        }
        
        // Clear existing data
        await this.connection.execute(`DELETE FROM ${tableName}`);
        console.log(`🗑️  Cleared existing data from ${tableName}`);
        
        // Insert restored data
        const columns = Object.keys(data[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        for (const row of data) {
            const values = columns.map(col => row[col]);
            await this.connection.execute(query, values);
        }
        
        console.log(`✅ Restored ${data.length} rows to ${tableName}`);
    }

    async listBackups() {
        console.log('📂 Available backups:');
        
        const files = fs.readdirSync(this.backupDir)
            .filter(file => file.endsWith('.json'))
            .sort()
            .reverse();
        
        files.forEach(file => {
            const stats = fs.statSync(path.join(this.backupDir, file));
            const size = (stats.size / 1024).toFixed(2);
            console.log(`  ${file} (${size} KB) - ${stats.mtime.toLocaleString()}`);
        });
        
        return files;
    }

    async cleanOldBackups(daysToKeep = 30) {
        console.log(`🧹 Cleaning backups older than ${daysToKeep} days...`);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const files = fs.readdirSync(this.backupDir);
        let deletedCount = 0;
        
        for (const file of files) {
            const filepath = path.join(this.backupDir, file);
            const stats = fs.statSync(filepath);
            
            if (stats.mtime < cutoffDate) {
                fs.unlinkSync(filepath);
                console.log(`🗑️  Deleted old backup: ${file}`);
                deletedCount++;
            }
        }
        
        console.log(`✅ Cleaned ${deletedCount} old backup files`);
        return deletedCount;
    }
}

// Command line interface
async function main() {
    const command = process.argv[2];
    const backup = new DatabaseBackup();

    try {
        await backup.connect();

        switch (command) {
            case 'create':
                await backup.backupGiftCodes();
                break;
            
            case 'list':
                await backup.listBackups();
                break;
            
            case 'clean':
                const days = parseInt(process.argv[3]) || 30;
                await backup.cleanOldBackups(days);
                break;
            
            case 'restore':
                const filename = process.argv[3];
                if (!filename) {
                    console.error('❌ Please specify backup filename');
                    process.exit(1);
                }
                await backup.restoreTable(filename);
                break;
            
            default:
                console.log(`
📦 Database Backup Manager

Commands:
  create                    - Create backup of gift codes system
  list                      - List all available backups
  clean [days]              - Clean backups older than N days (default: 30)
  restore <filename>        - Restore from specific backup file

Usage: node database/scripts/backup.js <command>
                `);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await backup.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatabaseBackup;
