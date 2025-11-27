const db = require('./db_webgame');
const crypto = require('crypto');
const { redisManager } = require('../config/redis');

class gameRanksModel {
    // Find all game arena ranks
    static async ArenaRankfindAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM arenarank 
        `;

        const [rows] = await db.getPool().execute(query);
       return rows;
    }

    // Find all game level ranks
    static async lvlRankfindAll(page = 1, limit = 20, filters = {}) {
        const redisKey = 'PRO_NAME_s1_serverLRank';
        
        try {
            // ลองอ่านจาก Redis ก่อน
            if (redisManager.isAvailable()) {
                const cachedData = await redisManager.get(redisKey);
                if (cachedData) {
                    console.log(`📦 Cache hit: ${redisKey}`);
                    
                    // ถ้าข้อมูลเป็น string ให้ parse เป็น JSON
                    let parsedData;
                    try {
                        parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
                    } catch (parseError) {
                        console.warn('⚠️ Failed to parse cached data, falling back to database');
                        parsedData = null;
                    }
                    
                    if (parsedData) {
                        // ถ้าเป็น array ให้ return ตรงๆ (จาก database)
                        if (Array.isArray(parsedData)) {
                            return parsedData;
                        }
                        
                        // ถ้าเป็น object (จาก Redis) ให้แปลงเป็น array format
                        if (typeof parsedData === 'object' && parsedData !== null) {
                            const convertedArray = [];
                            let idCounter = 1;
                            
                            // แปลง object keys เป็น array items
                            for (const [roleid, playerData] of Object.entries(parsedData)) {
                                const convertedItem = {
                                    id: idCounter++,
                                    type: playerData.type || 0,
                                    roleid: roleid,
                                    serverid: playerData.serverid || 1,
                                    val: playerData.val || 0,
                                    info: playerData.info || {},
                                    save: playerData.save || true,
                                    updatedAt: new Date().toISOString() // เพิ่ม timestamp ปัจจุบัน
                                };
                                convertedArray.push(convertedItem);
                            }
                            
                            console.log(`🔄 Converted Redis object to array format: ${convertedArray.length} items`);
                            return convertedArray;
                        }
                        
                        // ถ้าเป็น structure อื่นๆ
                        if (parsedData.data && Array.isArray(parsedData.data)) {
                            return parsedData.data;
                        }
                        
                        // ถ้าไม่ใช่ array ให้ wrap เป็น array
                        return [parsedData];
                    }
                }
            }

            console.log(`🔄 Cache miss, fetching from database: ${redisKey}`);
            
            // ถ้าไม่มีใน Redis หรือ Redis ไม่ available ให้อ่านจาก database
            let query = `
                SELECT * FROM gamerank
            `;

            const [rows] = await db.getPool().execute(query);
            
            // เก็บข้อมูลใน Redis สำหรับครั้งถัดไป (TTL 5 นาที)
            if (redisManager.isAvailable() && rows.length > 0) {
                await redisManager.set(redisKey, JSON.stringify(rows), 300);
                console.log(`💾 Data cached to Redis: ${redisKey} (${rows.length} records)`);
            }
            
            return rows;
            
        } catch (error) {
            console.error('❌ Error in lvlRankfindAll:', error.message);
            
            // ถ้า error ลองอ่านจาก Redis อีกครั้ง (stale data)
            if (redisManager.isAvailable()) {
                try {
                    const staleData = await redisManager.get(redisKey);
                    if (staleData) {
                        console.log(`⚠️ Returning stale cache data: ${redisKey}`);
                        const parsedData = typeof staleData === 'string' ? JSON.parse(staleData) : staleData;
                        
                        // แปลงข้อมูล stale เหมือนกับข้อมูลปกติ
                        if (Array.isArray(parsedData)) {
                            return parsedData;
                        }
                        
                        if (typeof parsedData === 'object' && parsedData !== null) {
                            const convertedArray = [];
                            let idCounter = 1;
                            
                            for (const [roleid, playerData] of Object.entries(parsedData)) {
                                const convertedItem = {
                                    id: idCounter++,
                                    type: playerData.type || 0,
                                    roleid: roleid,
                                    serverid: playerData.serverid || 1,
                                    val: playerData.val || 0,
                                    info: playerData.info || {},
                                    save: playerData.save || true,
                                    updatedAt: new Date().toISOString()
                                };
                                convertedArray.push(convertedItem);
                            }
                            
                            return convertedArray;
                        }
                        
                        return [parsedData];
                    }
                } catch (staleError) {
                    console.error('❌ Failed to get stale cache data:', staleError.message);
                }
            }
            
            // ถ้าทุกอย่างล้มเหลว ให้ fallback ไปที่ database โดยตรง
            try {
                let query = `SELECT * FROM gamerank`;
                const [rows] = await db.getPool().execute(query);
                return rows;
            } catch (dbError) {
                console.error('❌ Database fallback failed:', dbError.message);
                throw error; // throw original error
            }
        }
    }
}


module.exports = gameRanksModel;
