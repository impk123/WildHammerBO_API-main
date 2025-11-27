const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeSQL() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3301,
            user: 'root',
            password: '',
            database: 'little_idlegame',
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL database');

        // Execute users table SQL
        const usersSQL = fs.readFileSync(path.join(__dirname, '../migrations/02_create_users_tables.sql'), 'utf8');
        console.log('📝 Executing users table SQL...');
        
        // Split SQL statements and execute them separately
        const usersSQLStatements = usersSQL.split(';').filter(stmt => stmt.trim());
        for (const statement of usersSQLStatements) {
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                } catch (error) {
                    if (!error.message.includes('Duplicate entry')) {
                        console.log(`⚠️  Statement warning: ${error.message}`);
                    }
                }
            }
        }
        console.log('✅ Users table created successfully');

        // Execute gift codes SQL
        const giftCodesSQL = fs.readFileSync(path.join(__dirname, '../migrations/01_create_gift_codes_tables.sql'), 'utf8');
        console.log('📝 Executing gift codes table SQL...');
        
        const giftCodesSQLStatements = giftCodesSQL.split(';').filter(stmt => stmt.trim());
        for (const statement of giftCodesSQLStatements) {
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                } catch (error) {
                    if (!error.message.includes('Duplicate entry')) {
                        console.log(`⚠️  Statement warning: ${error.message}`);
                    }
                }
            }
        }
        console.log('✅ Gift codes tables created successfully');

        // Verify tables were created
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📋 Current tables in database:');
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });

        // Close connection
        await connection.end();
        console.log('✅ Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup error:', error.message);
        process.exit(1);
    }
}

// Run the setup
executeSQL();
