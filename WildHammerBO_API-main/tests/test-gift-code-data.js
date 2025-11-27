const mysql = require('mysql2/promise');
require('dotenv').config();

async function testGiftCodeData() {
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

        // Get all gift codes
        const [giftCodes] = await connection.execute(`
            SELECT 
                id, code, title, description, type, rewards, 
                max_usage, current_usage, max_usage_per_user, 
                is_active, start_date, end_date, created_at
            FROM gift_codes 
            ORDER BY created_at DESC
        `);

        console.log('\n📊 Gift Code Summary:');
        console.log(`Total gift codes: ${giftCodes.length}`);

        console.log('\n🎁 Gift Code Details:');
        giftCodes.forEach((code, index) => {
            console.log(`\n${index + 1}. ${code.code} - ${code.title}`);
            console.log(`   Type: ${code.type}`);
            console.log(`   Description: ${code.description}`);
            console.log(`   Rewards: ${code.rewards}`);
            console.log(`   Usage: ${code.current_usage || 0}/${code.max_usage} (max ${code.max_usage_per_user} per user)`);
            console.log(`   Status: ${code.is_active ? '✅ Active' : '❌ Inactive'}`);
            console.log(`   Valid: ${code.start_date} to ${code.end_date}`);
            console.log(`   Created: ${code.created_at}`);
        });

        // Test redemption table
        const [redemptions] = await connection.execute('SELECT COUNT(*) as count FROM gift_code_redemptions');
        console.log(`\n📈 Redemptions recorded: ${redemptions[0].count}`);

        // Show available test codes
        const activeCodes = giftCodes.filter(code => code.is_active);
        
        console.log('\n🚀 Ready for testing!');
        console.log('\n📋 Available test codes:');
        activeCodes.forEach(code => {
            const rewards = JSON.parse(code.rewards);
            console.log(`   • ${code.code} - ${code.title}`);
            if (rewards.coins) console.log(`     💰 ${rewards.coins} coins`);
            if (rewards.gems) console.log(`     💎 ${rewards.gems} gems`);
            if (rewards.experience) console.log(`     ⭐ ${rewards.experience} experience`);
            if (rewards.premium_currency) console.log(`     👑 ${rewards.premium_currency} premium currency`);
        });

        console.log('\n🌐 API Endpoints to test:');
        console.log('   GET  /api/gift-codes/all - List all gift codes');
        console.log('   POST /api/gift-codes/redeem - Redeem a gift code');
        console.log('   GET  /api/gift-codes/{code}/validate - Validate gift code');
        console.log('   POST /api/gift-codes/create - Create new gift code (admin)');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testGiftCodeData();
