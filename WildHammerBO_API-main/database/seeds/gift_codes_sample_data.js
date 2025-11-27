const mysql = require('mysql2/promise');

async function insertSampleGiftCodes() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3301,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'little_idlegame'
        });

        console.log('✅ Connected to MySQL database');

        // Sample gift codes
        const sampleGiftCodes = [
            {
                code: 'WELCOME2024',
                type: 'coins',
                reward_data: JSON.stringify({ coins: 1000, gems: 100 }),
                usage_limit: 1000,
                expires_at: '2024-12-31 23:59:59',
                is_active: 1,
                created_by: 3
            },
            {
                code: 'LAUNCH100',
                type: 'premium_currency',
                reward_data: JSON.stringify({ coins: 5000, gems: 500, items: { sword: 1 } }),
                usage_limit: 100,
                expires_at: '2024-09-30 23:59:59',
                is_active: 1,
                created_by: 3
            },
            {
                code: 'DAILY50',
                type: 'experience',
                reward_data: JSON.stringify({ coins: 500, experience: 1000 }),
                usage_limit: 50,
                expires_at: null,
                is_active: 1,
                created_by: 3
            }
        ];

        // Insert sample gift codes
        for (const giftCode of sampleGiftCodes) {
            try {
                await connection.execute(`
                    INSERT INTO gift_codes (code, type, reward_data, usage_limit, expires_at, is_active, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
                `, [
                    giftCode.code,
                    giftCode.type,
                    giftCode.reward_data,
                    giftCode.usage_limit,
                    giftCode.expires_at,
                    giftCode.is_active,
                    giftCode.created_by
                ]);
                console.log(`✅ Inserted gift code: ${giftCode.code}`);
            } catch (error) {
                if (!error.message.includes('Duplicate entry')) {
                    console.log(`⚠️  Error inserting ${giftCode.code}: ${error.message}`);
                }
            }
        }

        // Check current gift codes
        console.log('\n📋 Current gift codes in database:');
        const [codes] = await connection.execute('SELECT code, type, usage_limit, is_active FROM gift_codes');
        codes.forEach(code => {
            console.log(`  ${code.code} - ${code.type} (limit: ${code.usage_limit || 'unlimited'}) - ${code.is_active ? 'active' : 'inactive'}`);
        });

        await connection.end();
        console.log('\n✅ Sample gift codes setup completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Export for use in db_manager
module.exports = insertSampleGiftCodes;

// Run if called directly
if (require.main === module) {
    insertSampleGiftCodes();
}
