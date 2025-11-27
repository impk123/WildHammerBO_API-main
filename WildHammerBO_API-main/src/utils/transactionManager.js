const db_backoffice = require('../models/db_backoffice');
const { redisManager } = require('../config/redis');

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

module.exports = transactionManager;