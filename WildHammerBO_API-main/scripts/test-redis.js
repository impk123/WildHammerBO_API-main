const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Debug environment variables loading
console.log('🔍 Environment Variables Debug:');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);
console.log('ENV file path:', path.join(__dirname, '../.env'));
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '[SET]' : '[NOT SET]');
console.log('REDIS_DB:', process.env.REDIS_DB);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('-----------------------------------');

const { redisManager } = require('../src/config/redis');

async function testRedis() {
    try {
        // เชื่อมต่อ Redis
        await redisManager.connect();
        console.log('✅ Redis connected successfully');

        // ทดสอบ PING
        const pingResult = await redisManager.ping();
        console.log('📡 PING result:', pingResult);

        // ทดสอบ SET หลายๆ keys
        await redisManager.set('test:key1', 'Hello Redis 1!', 300);
        await redisManager.set('test:key2', 'Hello Redis 2!', 300);
        await redisManager.set('user:123', 'User Data', 300);
        await redisManager.set('game:player:456', 'Player Data', 300);
        console.log('💾 SET multiple test keys');

        // ทดสอบ KEYS pattern matching ด้วย client โดยตรง
        console.log('\n🔍 Testing KEYS patterns:');
        
        if (redisManager.client && redisManager.isConnected) {
            try {
                const allKeys = await redisManager.client.keys('*');
                console.log('� All keys (*):', allKeys);

                const testKeys = await redisManager.client.keys('test:*');
                console.log('🧪 Test keys (test:*):', testKeys);

                const gameKeys = await redisManager.client.keys('game:*');
                console.log('🎮 Game keys (game:*):', gameKeys);

                const proKeys = await redisManager.client.keys('PRO_NAME_*');
                console.log('🏆 PRO_NAME keys (PRO_NAME_*):', proKeys);

                const userKeys = await redisManager.client.keys('user:*');
                console.log('👤 User keys (user:*):', userKeys);

                // ลบ test keys ที่สร้างขึ้น
                console.log('\n🗑️ Cleaning up test keys...');
                for (const key of testKeys) {
                    await redisManager.del(key);
                }
                await redisManager.del('user:123');
                await redisManager.del('game:player:456');
                console.log('✅ Test keys cleaned up');

            } catch (keyError) {
                console.error('❌ KEYS command failed:', keyError.message);
            }
        }

        // ทดสอบ GET
        const value1 = await redisManager.get('test:key1');
        console.log('📤 GET test:key1 =', value1);

        // ทดสอบดึงข้อมูลที่มีอยู่แล้ว
        const existingValue = await redisManager.get('PRO_NAME_1_284182702415909_requip');
        console.log('🎮 Game data:', existingValue ? 'Found' : 'Not found');

        // ปิดการเชื่อมต่อ
        await redisManager.close();
        console.log('🔌 Redis connection closed');

    } catch (err) {
        console.error('❌ Redis test failed:', err.message);
        console.error('📋 Full error:', err);
        
        // พยายามปิดการเชื่อมต่อถ้ายังเปิดอยู่
        try {
            await redisManager.close();
        } catch (closeErr) {
            console.error('Failed to close Redis connection:', closeErr.message);
        }
        
        process.exit(1);
    }
}

// รันการทดสอบ
testRedis();