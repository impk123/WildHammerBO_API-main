require('dotenv').config();
const redis = require('redis');
const db_backoffice = require('../models/db_backoffice');

class RedisManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.retryAttempts = 0;
        this.maxRetries = 3; // ลดจำนวนครั้งใน retry
        this.retryDelay = 3000; // 3 วินาที
        this.retryTimeout = null; // เก็บ reference ของ setTimeout
        this.shouldStopRetry = false; // flag เพื่อหยุดการ retry
    }

    async connect() {
        try {
            // ตรวจสอบว่า Redis ถูก disable หรือไม่
            if (process.env.REDIS_DISABLED === 'true') {
                console.log('⚠️ Redis is disabled by configuration');
                return false;
            }

            // ตรวจสอบว่าเคยมี authentication error หรือไม่
            if (this.shouldStopRetry) {
                console.log('⚠️ Redis connection skipped due to previous authentication error');
                return false;
            }

            const redisConfig = {
                socket: {
                    host: process.env.REDIS_HOST || '127.0.0.1',
                    port: parseInt(process.env.REDIS_PORT) || 6379,
                    connectTimeout: 5000,
                    commandTimeout: 5000
                },
                password: process.env.REDIS_PASSWORD || undefined,
                database: parseInt(process.env.REDIS_DB) || 0,
                retryDelayOnFailover: 100,
                retryDelayOnClusterDown: 300,
                retryDelayOnLocalFailure: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: false
            };

            // console.log('======================================')
            // console.log('🔧 Final Redis Config:');
            // console.log('  Host:', redisConfig.socket.host);
            // console.log('  Port:', redisConfig.socket.port);
            // console.log('  Database:', redisConfig.database);
            // console.log('  Has Password:', redisConfig.password);

            this.client = redis.createClient(redisConfig);

            // Event handlers
            this.client.on('connect', () => {
                console.log('🔗 Redis connecting...');
            });

            this.client.on('ready', () => {
                console.log('✅ Redis connected and ready');
                this.isConnected = true;
                this.retryAttempts = 0;
                
                // Clear retry timeout when connection is successful
                if (this.retryTimeout) {
                    clearTimeout(this.retryTimeout);
                    this.retryTimeout = null;
                }
            });

            this.client.on('error', (err) => {
                console.error('❌ Redis error:', err.message);
                this.isConnected = false;
                
                // ไม่ retry หาก error เป็น connection refused หรือ authentication error
                if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || 
                    err.message.includes('no password is set') || 
                    err.message.includes('AUTH') ||
                    err.message.includes('WRONGPASS')) {
                    console.warn('⚠️ Redis server not available or authentication failed, operating without cache');
                    this.shouldStopRetry = true;
                    // Disconnect client เพื่อหยุดการ reconnect
                    if (this.client && this.client.isOpen) {
                        this.client.disconnect();
                    }
                    return;
                }

                if (this.retryAttempts < this.maxRetries) {
                    this.retryAttempts++;
                    console.log(`🔄 Redis retry attempt ${this.retryAttempts}/${this.maxRetries} in ${this.retryDelay}ms`);
                    
                    // Clear previous timeout if exists
                    if (this.retryTimeout) {
                        clearTimeout(this.retryTimeout);
                    }
                    
                    // Set new timeout
                    this.retryTimeout = setTimeout(() => {
                        this.retryTimeout = null;
                        this.connect();
                    }, this.retryDelay);
                } else {
                    console.warn('❌ Redis max retries reached, operating without cache');
                    // Clear timeout when max retries reached
                    if (this.retryTimeout) {
                        clearTimeout(this.retryTimeout);
                        this.retryTimeout = null;
                    }
                }
            });

            this.client.on('end', () => {
                console.log('🔌 Redis connection ended');
                this.isConnected = false;
                
                // Clear retry timeout when connection ends
                if (this.retryTimeout) {
                    clearTimeout(this.retryTimeout);
                    this.retryTimeout = null;
                }
            });

            this.client.on('reconnecting', () => {
                if (this.shouldStopRetry) {
                    console.log('🛑 Redis reconnecting stopped due to authentication error');
                    // ตรวจสอบว่า client ยังเชื่อมต่ออยู่หรือไม่ก่อน disconnect
                    if (this.client && this.client.isOpen) {
                        this.client.disconnect();
                    }
                    return;
                }
                console.log('🔄 Redis reconnecting...');
            });

            await this.client.connect();
            return true;
            
        } catch (error) {
            console.warn('⚠️ Redis connection failed, continuing without cache:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    
    async get(key) {
        // ตรวจสอบว่าเคยมี authentication error หรือไม่
        if (this.shouldStopRetry) {
            return null;
        }

        // Lazy connection - connect if not connected
        if (!this.isConnected || !this.client) {
            const connected = await this.connect();
            if (!connected) {
                return null;
            }
        }

        try {
            return await this.client.get(key);
        } catch (error) {
            console.warn('⚠️ Redis GET error:', error.message);
            return null;
        }
    }

    async set(key, value, expireSeconds = 3600) {
        // ตรวจสอบว่าเคยมี authentication error หรือไม่
        if (this.shouldStopRetry) {
            return false;
        }

        // Lazy connection - connect if not connected
        if (!this.isConnected || !this.client) {
            const connected = await this.connect();
            if (!connected) {
                return false;
            }
        }

        try {
            await this.client.setEx(key, expireSeconds, value);
            return true;
        } catch (error) {
            console.warn('⚠️ Redis SET error:', error.message);
            return false;
        }
    }

    async del(key) {
        // ตรวจสอบว่าเคยมี authentication error หรือไม่
        if (this.shouldStopRetry) {
            return false;
        }

        // Lazy connection - connect if not connected
        if (!this.isConnected || !this.client) {
            const connected = await this.connect();
            if (!connected) {
                return false;
            }
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.warn('⚠️ Redis DEL error:', error.message);
            return false;
        }
    }

    async flushPattern(pattern) {
        // ตรวจสอบว่าเคยมี authentication error หรือไม่
        if (this.shouldStopRetry) {
            return false;
        }

        // Lazy connection - connect if not connected
        if (!this.isConnected || !this.client) {
            const connected = await this.connect();
            if (!connected) {
                return false;
            }
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            console.warn('⚠️ Redis FLUSH error:', error.message);
            return false;
        }
    }

    async close() {
        // Clear any pending retry timeout
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                console.log('✅ Redis connection closed gracefully');
            } catch (error) {
                console.warn('⚠️ Redis close error:', error.message);
            }
            this.isConnected = false;
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            retryAttempts: this.retryAttempts,
            maxRetries: this.maxRetries,
            available: !!this.client,
            hasRetryTimeout: !!this.retryTimeout
        };
    }

    // เพิ่มฟังก์ชันสำหรับตรวจสอบว่า Redis available หรือไม่
    isAvailable() {
        return this.isConnected && this.client;
    }

    // เพิ่มฟังก์ชันสำหรับ health check
    async ping() {
        // ตรวจสอบว่าเคยมี authentication error หรือไม่
        if (this.shouldStopRetry) {
            return false;
        }

        // Lazy connection - connect if not connected
        if (!this.isConnected || !this.client) {
            const connected = await this.connect();
            if (!connected) {
                return false;
            }
        }

        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            console.warn('⚠️ Redis ping failed:', error.message);
            return false;
        }
    }

    // เพิ่มฟังก์ชันสำหรับ clear retry timeout
    clearRetryTimeout() {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
            console.log('🧹 Redis retry timeout cleared');
            return true;
        }
        return false;
    }

    // เพิ่มฟังก์ชันสำหรับ reset retry flag
    resetRetryFlag() {
        this.shouldStopRetry = false;
        this.retryAttempts = 0;
        console.log('🔄 Redis retry flag reset');
    }
}

// Create singleton instance ของ RedisManager ก่อน
const redisManager = new RedisManager();

class TransactionManager {
    constructor() {
        this.activeTransactions = new Map();
    }

    // Start database transaction
    async beginTransaction() {
        const connection = await db_backoffice.getPool().getConnection();
        await connection.beginTransaction();
        
        const transactionId = this.generateTransactionId();
        this.activeTransactions.set(transactionId, {
            connection,
            startTime: Date.now(),
            operations: []
        });

        console.log(`🔄 Transaction started: ${transactionId}`);
        return { transactionId, connection };
    }

    // Execute operation within transaction
    async executeInTransaction(transactionId, operation, rollbackKeys = []) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        try {
            // Store rollback keys for Redis cleanup if needed
            transaction.operations.push({
                operation: operation.name || 'unknown',
                rollbackKeys,
                timestamp: Date.now()
            });

            // Execute the operation
            const result = await operation(transaction.connection);
            
            console.log(`✅ Operation executed in transaction ${transactionId}:`, operation.name || 'operation');
            return result;

        } catch (error) {
            console.error(`❌ Operation failed in transaction ${transactionId}:`, error.message);
            throw error;
        }
    }

    // Commit transaction and sync to Redis
    async commitTransaction(transactionId, syncOperations = []) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        try {
            // Commit database transaction
            await transaction.connection.commit();
            console.log(`✅ Database transaction committed: ${transactionId}`);

            // Sync to Redis after successful database commit
            await this.syncToRedis(syncOperations);

            // Clean up
            transaction.connection.release();
            this.activeTransactions.delete(transactionId);

            const duration = Date.now() - transaction.startTime;
            console.log(`🎉 Transaction completed successfully: ${transactionId} (${duration}ms)`);

            return true;

        } catch (error) {
            console.error(`❌ Transaction commit failed: ${transactionId}`, error.message);
            await this.rollbackTransaction(transactionId);
            throw error;
        }
    }

    // Rollback transaction and clean up Redis
    async rollbackTransaction(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        try {
            // Rollback database transaction
            await transaction.connection.rollback();
            console.log(`🔄 Database transaction rolled back: ${transactionId}`);

            // Clean up Redis keys that might have been set during failed operations
            await this.cleanupRedisOnRollback(transaction.operations);

            // Clean up
            transaction.connection.release();
            this.activeTransactions.delete(transactionId);

            const duration = Date.now() - transaction.startTime;
            console.log(`↩️ Transaction rolled back: ${transactionId} (${duration}ms)`);

        } catch (error) {
            console.error(`❌ Transaction rollback failed: ${transactionId}`, error.message);
            // Force cleanup even if rollback fails
            transaction.connection.release();
            this.activeTransactions.delete(transactionId);
            throw error;
        }
    }

    // Sync data to Redis after successful database operations
    async syncToRedis(syncOperations) {
        if (!Array.isArray(syncOperations) || syncOperations.length === 0) {
            return true;
        }

        console.log(`🔄 Syncing ${syncOperations.length} operations to Redis...`);

        for (const operation of syncOperations) {
            try {
                switch (operation.type) {
                    case 'set':
                        await redisManager.set(operation.key, JSON.stringify(operation.data), operation.ttl || 3600);
                        break;
                    case 'delete':
                        await redisManager.del(operation.key);
                        break;
                    case 'flush_pattern':
                        await redisManager.flushPattern(operation.pattern);
                        break;
                    default:
                        console.warn(`⚠️ Unknown Redis sync operation: ${operation.type}`);
                }
                console.log(`✅ Redis sync: ${operation.type} ${operation.key || operation.pattern}`);
            } catch (error) {
                console.error(`❌ Redis sync failed for ${operation.type}:`, error.message);
                // Continue with other operations even if one fails
            }
        }

        console.log(`✅ Redis sync completed`);
    }

    // Clean up Redis keys on transaction rollback
    async cleanupRedisOnRollback(operations) {
        for (const operation of operations) {
            if (operation.rollbackKeys && operation.rollbackKeys.length > 0) {
                for (const key of operation.rollbackKeys) {
                    try {
                        await redisManager.del(key);
                        console.log(`🧹 Cleaned up Redis key on rollback: ${key}`);
                    } catch (error) {
                        console.error(`❌ Failed to cleanup Redis key: ${key}`, error.message);
                    }
                }
            }
        }
    }

    // Generate unique transaction ID
    generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get transaction info
    getTransactionInfo(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            return null;
        }

        return {
            id: transactionId,
            startTime: transaction.startTime,
            duration: Date.now() - transaction.startTime,
            operationsCount: transaction.operations.length,
            operations: transaction.operations
        };
    }

    // Get all active transactions
    getActiveTransactions() {
        const transactions = [];
        for (const [id, transaction] of this.activeTransactions) {
            transactions.push({
                id,
                startTime: transaction.startTime,
                duration: Date.now() - transaction.startTime,
                operationsCount: transaction.operations.length
            });
        }
        return transactions;
    }

    // Cleanup old transactions (safety mechanism)
    async cleanupOldTransactions(maxAgeMs = 300000) { // 5 minutes
        const now = Date.now();
        const oldTransactions = [];

        for (const [id, transaction] of this.activeTransactions) {
            if (now - transaction.startTime > maxAgeMs) {
                oldTransactions.push(id);
            }
        }

        for (const id of oldTransactions) {
            console.warn(`⚠️ Cleaning up old transaction: ${id}`);
            await this.rollbackTransaction(id);
        }

        return oldTransactions.length;
    }
}

// Create singleton instance
const transactionManager = new TransactionManager();

// Export ทั้ง redisManager และ transactionManager
module.exports = {
    redisManager,
    transactionManager
};
