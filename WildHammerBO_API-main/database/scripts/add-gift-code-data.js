const mysql = require('mysql2/promise');
require('dotenv').config();

async function addGiftCodeData() {
    let connection;
    
    try {
        console.log('🔄 Connecting to database...');
        
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'little_idlegame'
        });

        console.log('✅ Connected to database');

        // Check if gift_codes table exists
        const [tables] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = 'gift_codes'
        `);

        if (tables[0].count === 0) {
            console.log('❌ Gift codes table does not exist. Please create tables first.');
            return;
        }

        // Check current gift code count
        const [existingCodes] = await connection.execute('SELECT COUNT(*) as count FROM gift_codes');
        console.log(`📊 Current gift codes in database: ${existingCodes[0].count}`);

        if (existingCodes[0].count > 5) {
            console.log('✅ Gift codes already populated, skipping data insertion');
            
            // Show existing codes
            const [codes] = await connection.execute(`
                SELECT code, title, type, is_active 
                FROM gift_codes 
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            
            console.log('\n🎁 Existing Gift Codes:');
            codes.forEach(code => {
                console.log(`   • ${code.code} - ${code.title} (${code.type}) ${code.is_active ? '✅' : '❌'}`);
            });
            return;
        }

        console.log('🔄 Adding sample gift codes...');

        // Insert sample gift codes
        const sampleCodes = [
            {
                code: 'WELCOME2024',
                title: 'Welcome Gift 2024',
                description: 'Welcome gift for new players',
                type: 'welcome',
                rewards: JSON.stringify({ coins: 1000, gems: 50, items: [{ id: 1, quantity: 5 }] }),
                max_usage: 1000,
                max_usage_per_user: 1,
                is_active: 1,
                start_date: '2024-01-01 00:00:00',
                end_date: '2024-12-31 23:59:59'
            },
            {
                code: 'DAILY50',
                title: 'Daily Bonus 50',
                description: 'Daily login bonus',
                type: 'daily',
                rewards: JSON.stringify({ coins: 500, experience: 100 }),
                max_usage: 10000,
                max_usage_per_user: 1,
                is_active: 1,
                start_date: '2024-01-01 00:00:00',
                end_date: '2024-12-31 23:59:59'
            },
            {
                code: 'TEST123',
                title: 'Development Test Code',
                description: 'For development testing purposes',
                type: 'development',
                rewards: JSON.stringify({ coins: 100, gems: 10 }),
                max_usage: 999999,
                max_usage_per_user: 999,
                is_active: 1,
                start_date: '2024-01-01 00:00:00',
                end_date: '2025-12-31 23:59:59'
            },
            {
                code: 'VIP2024',
                title: 'VIP Member Gift',
                description: 'Exclusive gift for VIP members',
                type: 'vip',
                rewards: JSON.stringify({ coins: 5000, gems: 200, premium_currency: 100 }),
                max_usage: 500,
                max_usage_per_user: 1,
                is_active: 1,
                start_date: '2024-01-01 00:00:00',
                end_date: '2024-12-31 23:59:59'
            },
            {
                code: 'SOCIAL100',
                title: 'Social Media Follower Gift',
                description: 'Thank you for following us on social media',
                type: 'social',
                rewards: JSON.stringify({ coins: 2000, gems: 75 }),
                max_usage: 2000,
                max_usage_per_user: 1,
                is_active: 1,
                start_date: '2024-01-01 00:00:00',
                end_date: '2024-12-31 23:59:59'
            }
        ];

        // Check if created_by admin exists
        const [admins] = await connection.execute('SELECT id FROM admins LIMIT 1');
        const adminId = admins.length > 0 ? admins[0].id : null;

        let insertedCount = 0;
        
        for (const giftCode of sampleCodes) {
            try {
                // Check if code already exists
                const [existing] = await connection.execute(
                    'SELECT COUNT(*) as count FROM gift_codes WHERE code = ?',
                    [giftCode.code]
                );

                if (existing[0].count === 0) {
                    await connection.execute(`
                        INSERT INTO gift_codes (
                            code, title, description, type, rewards, max_usage, 
                            max_usage_per_user, is_active, start_date, end_date, 
                            created_by, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    `, [
                        giftCode.code,
                        giftCode.title,
                        giftCode.description,
                        giftCode.type,
                        giftCode.rewards,
                        giftCode.max_usage,
                        giftCode.max_usage_per_user,
                        giftCode.is_active,
                        giftCode.start_date,
                        giftCode.end_date,
                        adminId
                    ]);
                    
                    insertedCount++;
                    console.log(`   ✅ Added: ${giftCode.code}`);
                } else {
                    console.log(`   ⚠️  Skipped: ${giftCode.code} (already exists)`);
                }
            } catch (error) {
                console.error(`   ❌ Failed to add ${giftCode.code}:`, error.message);
            }
        }

        console.log(`\n✅ Gift code data migration completed!`);
        console.log(`📊 New gift codes added: ${insertedCount}`);

        // Show final count and sample codes
        const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM gift_codes');
        const [activeCodes] = await connection.execute(`
            SELECT code, title, type, 
                   JSON_EXTRACT(rewards, '$.coins') as coins,
                   JSON_EXTRACT(rewards, '$.gems') as gems
            FROM gift_codes 
            WHERE is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        console.log(`📊 Total gift codes in database: ${finalCount[0].count}`);
        console.log('\n🎁 Active Gift Codes:');
        activeCodes.forEach(code => {
            console.log(`   • ${code.code} - ${code.title} (${code.type})`);
            console.log(`     Rewards: ${code.coins || 0} coins, ${code.gems || 0} gems`);
        });

        console.log('\n🚀 Ready to test gift code system!');
        console.log('\n📋 Test these codes:');
        console.log('   • WELCOME2024 - Welcome gift');
        console.log('   • TEST123 - Development testing');
        console.log('   • DAILY50 - Daily bonus');
        console.log('   • VIP2024 - VIP member gift');

    } catch (error) {
        console.error('❌ Data migration failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    addGiftCodeData()
        .then(() => {
            console.log('\n✅ Gift code data migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Data migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = addGiftCodeData;
