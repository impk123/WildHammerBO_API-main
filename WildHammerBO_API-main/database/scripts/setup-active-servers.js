const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupActiveServersTable() {
    let connection;
    
    try {
        // Connect to wgbackend database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST_BACKEND || 'localhost',
            user: process.env.DB_USER_BACKEND || 'root',
            password: process.env.DB_PASSWORD_BACKEND || '',
            database: process.env.DB_NAME_BACKEND || 'lyz_wgbackend',
            port: process.env.DB_PORT_BACKEND || 3306,
        });

        console.log('🔗 Connected to wgbackend database');

        // Create active_servers table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS \`active_servers\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`server_id_list\` varchar(255) NOT NULL DEFAULT '[]' COMMENT 'JSON array of active server IDs like [1,2,3]',
                \`ios_version_code\` varchar(50) DEFAULT NULL COMMENT 'iOS app version code',
                \`android_version_code\` varchar(50) DEFAULT NULL COMMENT 'Android app version code',
                \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await connection.execute(createTableQuery);
        console.log('✅ Created active_servers table');

        // Insert default record with id=1
        const insertQuery = `
            INSERT INTO \`active_servers\` (\`id\`, \`server_id_list\`, \`ios_version_code\`, \`android_version_code\`) 
            VALUES (1, '[1,2,3]', '1.0.0', '1.0.0') 
            ON DUPLICATE KEY UPDATE 
                \`server_id_list\` = VALUES(\`server_id_list\`),
                \`ios_version_code\` = COALESCE(\`ios_version_code\`, VALUES(\`ios_version_code\`)),
                \`android_version_code\` = COALESCE(\`android_version_code\`, VALUES(\`android_version_code\`))
        `;

        const [result] = await connection.execute(insertQuery);
        console.log('✅ Inserted/Updated default active servers record:', result);

        // Verify the data
        const [rows] = await connection.execute('SELECT * FROM active_servers WHERE id = 1');
        console.log('📋 Current active servers data:', rows[0]);

        console.log('🎉 Active servers table setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up active servers table:', error);
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
    setupActiveServersTable()
        .then(() => {
            console.log('✅ Setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupActiveServersTable;
