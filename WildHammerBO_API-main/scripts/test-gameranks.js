const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const gameRanksModel = require('../src/models/gameRanks');
const { redisManager } = require('../src/config/redis');

async function testGameRanks() {
    try {
        // เชื่อมต่อ Redis
        await redisManager.connect();
        console.log('✅ Redis connected successfully');

        // ดูข้อมูลใน Redis ก่อน
        console.log('\n🔍 Checking Redis data:');
        const redisData = await redisManager.get('PRO_NAME_s1_serverLRank');
        console.log('Redis data exists:', !!redisData);
        if (redisData) {
            console.log('Redis data type:', typeof redisData);
            console.log('Redis data preview:', 
                typeof redisData === 'string' 
                    ? redisData.substring(0, 200) + '...' 
                    : JSON.stringify(redisData).substring(0, 200) + '...'
            );
        }

        // ทดสอบ lvlRankfindAll
        console.log('\n🎮 Testing lvlRankfindAll:');
        const startTime = Date.now();
        const ranks = await gameRanksModel.lvlRankfindAll();
        const endTime = Date.now();
        
        console.log(`⏱️  Query time: ${endTime - startTime}ms`);
        console.log(`📊 Results count: ${ranks ? ranks.length : 0}`);
        
        if (ranks && ranks.length > 0) {
            console.log('📋 Sample data (first record):');
            console.log(JSON.stringify(ranks[0], null, 2));
        }

        // ทดสอบการเรียกครั้งที่ 2 (ควรได้จาก cache)
        console.log('\n🔄 Testing second call (should use cache):');
        const startTime2 = Date.now();
        const ranks2 = await gameRanksModel.lvlRankfindAll();
        const endTime2 = Date.now();
        
        console.log(`⏱️  Query time: ${endTime2 - startTime2}ms`);
        console.log(`📊 Results count: ${ranks2 ? ranks2.length : 0}`);

        // ปิดการเชื่อมต่อ
        await redisManager.close();
        console.log('\n🔌 Redis connection closed');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        console.error('📋 Full error:', err);
        
        try {
            await redisManager.close();
        } catch (closeErr) {
            console.error('Failed to close Redis connection:', closeErr.message);
        }
        
        process.exit(1);
    }
}

// รันการทดสอบ
testGameRanks();
