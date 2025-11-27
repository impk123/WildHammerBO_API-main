const mysql = require('mysql2/promise');
require('dotenv').config();

async function addVersionFields() {
    let connection;
    
    try {
        // Connect to backoffice database (since user changed to db_backoffice)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'backoffice',
            port: process.env.DB_PORT || 3306,
        });

        console.log('🔗 Connected to backoffice database');

        // Check if columns exist first
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'active_servers' AND COLUMN_NAME IN ('ios_version_code', 'android_version_code')
        `, [process.env.DB_NAME || 'backoffice']);

        const existingColumns = columns.map(col => col.COLUMN_NAME);

        // Add ios_version_code column if it doesn't exist
        if (!existingColumns.includes('ios_version_code')) {
            const addIosColumnQuery = `
                ALTER TABLE \`active_servers\` 
                ADD COLUMN \`ios_version_code\` varchar(50) DEFAULT NULL COMMENT 'iOS app version code'
            `;
            await connection.execute(addIosColumnQuery);
            console.log('✅ Added ios_version_code column');
        } else {
            console.log('ℹ️ ios_version_code column already exists');
        }

        // Add android_version_code column if it doesn't exist
        if (!existingColumns.includes('android_version_code')) {
            const addAndroidColumnQuery = `
                ALTER TABLE \`active_servers\` 
                ADD COLUMN \`android_version_code\` varchar(50) DEFAULT NULL COMMENT 'Android app version code'
            `;
            await connection.execute(addAndroidColumnQuery);
            console.log('✅ Added android_version_code column');
        } else {
            console.log('ℹ️ android_version_code column already exists');
        }

        // Update existing record with default version codes
        const updateQuery = `
            UPDATE \`active_servers\` 
            SET 
                \`ios_version_code\` = COALESCE(\`ios_version_code\`, '1.0.0'),
                \`android_version_code\` = COALESCE(\`android_version_code\`, '1.0.0')
            WHERE id = 1
        `;

        const [result] = await connection.execute(updateQuery);
        console.log('✅ Updated version codes:', result);

        // Verify the data
        const [rows] = await connection.execute('SELECT * FROM active_servers WHERE id = 1');
        console.log('📋 Current active servers data:', rows[0]);

        console.log('🎉 Version fields added successfully!');

    } catch (error) {
        console.error('❌ Error adding version fields:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    addVersionFields()
        .then(() => {
            console.log('✅ Setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error);
            process.exit(1);
        });
}

module.exports = addVersionFields;
