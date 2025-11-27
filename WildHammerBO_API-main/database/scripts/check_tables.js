const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '123456',
            database: process.env.DB_NAME || 'wildhammer'
        });

        console.log('✅ Connected to MySQL database');

        // Check users table structure
        console.log('\n📋 Users table structure:');
        const [usersColumns] = await connection.execute('DESCRIBE users');
        usersColumns.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });

        // Check gift_codes table structure
        console.log('\n📋 Gift codes table structure:');
        const [giftCodesColumns] = await connection.execute('DESCRIBE gift_codes');
        giftCodesColumns.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });

        // Check gift_code_redemptions table structure
        console.log('\n📋 Gift code redemptions table structure:');
        const [redemptionsColumns] = await connection.execute('DESCRIBE gift_code_redemptions');
        redemptionsColumns.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });

        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTables();
