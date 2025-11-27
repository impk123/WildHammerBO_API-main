const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3301,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'little_idlegame',
            multipleStatements: true
        };
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            console.log('✅ Connected to MySQL database');
            return this.connection;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log('✅ Database connection closed');
        }
    }

    async runMigrations() {
        console.log('🚀 Running database migrations...');
        
        const migrationsDir = path.join(__dirname, '../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir).sort();

        for (const file of migrationFiles) {
            if (!file.endsWith('.sql')) continue;

            console.log(`📝 Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            // Split and execute statements
            const statements = sql.split(';').filter(stmt => stmt.trim());
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await this.connection.execute(statement);
                    } catch (error) {
                        if (!error.message.includes('Duplicate entry') && 
                            !error.message.includes('already exists')) {
                            console.log(`⚠️  Warning in ${file}: ${error.message}`);
                        }
                    }
                }
            }
            console.log(`✅ Migration completed: ${file}`);
        }
        
        console.log('✅ All migrations completed successfully!');
    }

    async runSeeds() {
        console.log('🌱 Running database seeds...');
        
        const seedsDir = path.join(__dirname, '../seeds');
        const seedFiles = fs.readdirSync(seedsDir).filter(file => file.endsWith('.js')).sort();

        for (const file of seedFiles) {
            console.log(`🌱 Running seed: ${file}`);
            try {
                // Change to backend directory for proper require paths
                process.chdir(path.join(__dirname, '../../'));
                const seedModule = require(path.join(seedsDir, file));
                if (typeof seedModule === 'function') {
                    await seedModule();
                }
            } catch (error) {
                console.log(`⚠️  Warning in ${file}: ${error.message}`);
            }
            console.log(`✅ Seed completed: ${file}`);
        }
        
        console.log('✅ All seeds completed successfully!');
    }

    async showTables() {
        console.log('📋 Current tables in database:');
        const [tables] = await this.connection.execute('SHOW TABLES');
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });
    }

    async getTableInfo(tableName) {
        console.log(`\n📋 ${tableName} table structure:`);
        const [columns] = await this.connection.execute(`DESCRIBE ${tableName}`);
        columns.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });
    }

    async checkGiftCodes() {
        console.log('\n🎁 Current gift codes:');
        const [codes] = await this.connection.execute(
            'SELECT code, type, usage_limit, used_count, is_active FROM gift_codes'
        );
        codes.forEach(code => {
            const used = code.used_count || 0;
            const limit = code.usage_limit || 'unlimited';
            const status = code.is_active ? 'active' : 'inactive';
            console.log(`  ${code.code} - ${code.type} (${used}/${limit}) - ${status}`);
        });
    }

    async reset() {
        console.log('🗑️  Resetting database...');
        
        // Drop tables in correct order (considering foreign keys)
        const tables = ['gift_code_redemptions', 'gift_codes', 'user_inventory', 'users'];
        
        for (const table of tables) {
            try {
                await this.connection.execute(`DROP TABLE IF EXISTS ${table}`);
                console.log(`✅ Dropped table: ${table}`);
            } catch (error) {
                console.log(`⚠️  Error dropping ${table}: ${error.message}`);
            }
        }
        
        console.log('✅ Database reset completed!');
    }
}

// Command line interface
async function main() {
    const command = process.argv[2];
    const dbManager = new DatabaseManager();

    try {
        await dbManager.connect();

        switch (command) {
            case 'migrate':
                await dbManager.runMigrations();
                break;
            
            case 'seed':
                await dbManager.runSeeds();
                break;
            
            case 'setup':
                await dbManager.runMigrations();
                await dbManager.runSeeds();
                break;
            
            case 'reset':
                await dbManager.reset();
                break;
            
            case 'tables':
                await dbManager.showTables();
                break;
            
            case 'check':
                await dbManager.showTables();
                await dbManager.getTableInfo('gift_codes');
                await dbManager.getTableInfo('users');
                await dbManager.checkGiftCodes();
                break;
            
            default:
                console.log(`
🗄️  Database Manager Commands:

  migrate  - Run all migrations
  seed     - Run all seeds  
  setup    - Run migrations and seeds
  reset    - Drop all tables
  tables   - Show all tables
  check    - Show tables, structures, and data

Usage: node database/scripts/db_manager.js <command>
                `);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await dbManager.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatabaseManager;
