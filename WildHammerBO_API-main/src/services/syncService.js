const { redisManager } = require('../config/redis');
const transactionManager = require('../utils/transactionManager');
const db_backoffice = require('../models/db_backoffice');

class SyncService {
    constructor() {
        this.syncQueue = [];
        this.isProcessing = false;
        this.syncStats = {
            successCount: 0,
            errorCount: 0,
            lastSync: null,
            withoutRedisCount: 0
        };
    }

    // Execute database operations with optional Redis sync
    async executeWithSync(operations, syncOperations = []) {
        const { transactionId, connection } = await transactionManager.beginTransaction();

        try {
            const results = [];

            // Execute all database operations within transaction
            for (const operation of operations) {
                const result = await transactionManager.executeInTransaction(
                    transactionId,
                    operation.execute,
                    operation.rollbackKeys || []
                );
                results.push(result);
            }

            // Commit transaction and optionally sync to Redis
            await transactionManager.commitTransaction(transactionId, syncOperations);

            this.syncStats.successCount++;
            this.syncStats.lastSync = new Date().toISOString();

            // นับครั้งที่ทำงานโดยไม่มี Redis
            if (!redisManager.isAvailable()) {
                this.syncStats.withoutRedisCount++;
            }

            return {
                success: true,
                results,
                transactionId,
                syncOperations: syncOperations.length,
                redisAvailable: redisManager.isAvailable()
            };

        } catch (error) {
            await transactionManager.rollbackTransaction(transactionId);
            this.syncStats.errorCount++;
            
            console.error('❌ Sync operation failed:', error.message);
            throw error;
        }
    }

    // Cache data with fallback when Redis unavailable
    async cacheWithRefresh(key, dataFetcher, ttl = 3600, forceRefresh = false) {
        try {
            // หาก Redis ไม่ available ให้ fetch ข้อมูลใหม่เสมอ
            if (!redisManager.isAvailable()) {
                //console.log(`🔄 Redis unavailable, fetching fresh data: ${key}`);
                return await dataFetcher();
            }

            // Try to get from cache first
            if (!forceRefresh) {
                const cached = await redisManager.get(key);
                if (cached) {
                    //console.log(`📦 Cache hit: ${key}`);
                    return JSON.parse(cached);
                }
            }

            //console.log(`🔄 Cache miss, fetching fresh data: ${key}`);
            
            // Fetch fresh data
            const freshData = await dataFetcher();
            
            // Cache the result if Redis is available
            if (redisManager.isAvailable()) {
                await redisManager.set(key, JSON.stringify(freshData), ttl);
                //console.log(`💾 Data cached: ${key} (TTL: ${ttl}s)`);
            } else {
                //console.log(`⚠️ Data not cached (Redis unavailable): ${key}`);
            }
            
            return freshData;

        } catch (error) {
            console.error(`❌ Cache operation failed for ${key}:`, error.message);
            
            // Try to return cached data even if refresh fails
            if (redisManager.isAvailable()) {
                try {
                    const cached = await redisManager.get(key);
                    if (cached) {
                        console.log(`⚠️ Returning stale cache data: ${key}`);
                        return JSON.parse(cached);
                    }
                } catch (cacheError) {
                    console.error('❌ Failed to get stale cache data:', cacheError.message);
                }
            }
            
            throw error;
        }
    }

    // Invalidate cache patterns (graceful when Redis unavailable)
    async invalidateCache(patterns) {
        if (!redisManager.isAvailable()) {
            console.log('⚠️ Cache invalidation skipped (Redis unavailable)');
            return true;
        }

        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        for (const pattern of patterns) {
            try {
                await redisManager.flushPattern(pattern);
                console.log(`🧹 Cache invalidated: ${pattern}`);
            } catch (error) {
                console.error(`❌ Cache invalidation failed for ${pattern}:`, error.message);
            }
        }
        return true;
    }

    // Sync specific model data (graceful when Redis unavailable)
    async syncModel(modelName, id, data, action = 'update') {
        if (!redisManager.isAvailable()) {
            console.log(`⚠️ Model sync skipped (Redis unavailable): ${modelName}:${id}`);
            return true;
        }

        const cacheKey = `${modelName}:${id}`;
        const listKey = `${modelName}:list:*`;

        try {
            switch (action) {
                case 'create':
                case 'update':
                    await redisManager.set(cacheKey, JSON.stringify(data), 3600);
                    await redisManager.flushPattern(listKey);
                    break;
                    
                case 'delete':
                    await redisManager.del(cacheKey);
                    await redisManager.flushPattern(listKey);
                    break;
                    
                default:
                    console.warn(`⚠️ Unknown sync action: ${action}`);
            }

            console.log(`✅ Model synced: ${modelName}:${id} (${action})`);
            return true;

        } catch (error) {
            console.error(`❌ Model sync failed: ${modelName}:${id}`, error.message);
            return false;
        }
    }

    // Get sync statistics
    getSyncStats() {
        return {
            ...this.syncStats,
            redis: redisManager.getStatus(),
            activeTransactions: transactionManager.getActiveTransactions(),
            queueSize: this.syncQueue.length,
            isProcessing: this.isProcessing
        };
    }

    // Health check for sync services
    async healthCheck() {
        const health = {
            database: false,
            redis: false,
            sync: true,
            timestamp: new Date().toISOString()
        };

        try {
            // Test database
            const pool = db_backoffice.getPool();
            await pool.execute('SELECT 1');
            health.database = true;
        } catch (error) {
            console.error('❌ Database health check failed:', error.message);
        }

        // Test Redis (non-blocking)
        health.redis = await redisManager.ping();

        health.overall = health.database && health.sync;
        
        return health;
    }

    // Cleanup old cache entries
    async cleanupCache(maxAge = 86400) {
        try {
            console.log('🧹 Starting cache cleanup...');
            
            // Cleanup transaction manager
            const cleanedTransactions = await transactionManager.cleanupOldTransactions();
            
            let redisCleanup = 'skipped (Redis unavailable)';
            if (redisManager.isAvailable()) {
                redisCleanup = 'completed';
                // Additional Redis cleanup if needed
            }
            
            console.log(`✅ Cache cleanup completed. Cleaned ${cleanedTransactions} old transactions, Redis: ${redisCleanup}`);
            
            return {
                cleanedTransactions,
                redisCleanup,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Cache cleanup failed:', error.message);
            throw error;
        }
    }
}

// Create singleton instance
const syncService = new SyncService();

module.exports = syncService;