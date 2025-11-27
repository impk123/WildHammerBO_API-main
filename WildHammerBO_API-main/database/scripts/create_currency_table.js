const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createCurrencyLogsTable() {
    let connection;
    
    try {
        // Database connection configuration
        connection = await mysql.createConnection({
            host: 'localhost',
            port: 3301,
            user: 'root',
            password: '',
            database: 'little_idlegame',
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL database');

        // Read and execute currency logs migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', '05_create_currency_logs_table.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await connection.execute(sql);
        console.log('✅ Currency logs table created successfully');

        // Verify table creation
        const [tables] = await connection.execute("SHOW TABLES LIKE 'currency_logs'");
        if (tables.length > 0) {
            console.log('✅ Currency logs table verified');
        } else {
            console.log('❌ Currency logs table not found');
        }

    } catch (error) {
        console.error('❌ Error creating currency logs table:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createCurrencyLogsTable();
