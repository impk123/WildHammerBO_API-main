const db_backoffice = require('./db_backoffice');
const { v4: uuidv4 } = require('uuid');

class PaymentTransaction {
    // Create new transaction
    static async create(transactionData) {
        try {
            const {
                package_id, user_id, user_email, amount, currency,
                payment_method, payment_provider, provider_transaction_id,
                ip_address, user_agent, platform, country_code
            } = transactionData;
            
            const transaction_id = `txn_${Date.now()}_${uuidv4().substring(0, 8)}`;
            
            const [result] = await db_backoffice.getPool().execute(`
                INSERT INTO payment_transactions (
                    transaction_id, package_id, user_id, user_email,
                    amount, currency, payment_method, payment_provider,
                    provider_transaction_id, status, ip_address,
                    user_agent, platform, country_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            `, [
                transaction_id, package_id, user_id, user_email,
                amount, currency || 'USD', payment_method, payment_provider,
                provider_transaction_id, ip_address, user_agent, platform, country_code
            ]);
            
            return await this.getById(transaction_id);
        } catch (error) {
            console.error('Error creating payment transaction:', error);
            throw error;
        }
    }
    
    // Get transaction by ID
    static async getById(transactionId) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT 
                    t.*,
                    p.name as package_name,
                    p.rewards as package_rewards,
                    u.username, u.email as user_email_from_users
                FROM payment_transactions t
                LEFT JOIN payment_packages p ON t.package_id = p.package_id
                LEFT JOIN users u ON t.user_id = u.id
                WHERE t.transaction_id = ?
            `, [transactionId]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const transaction = rows[0];
            return {
                ...transaction,
                package_rewards: transaction.package_rewards ? 
                    (typeof transaction.package_rewards === 'string' ? 
                        JSON.parse(transaction.package_rewards) : transaction.package_rewards) : null
            };
        } catch (error) {
            console.error('Error getting transaction by ID:', error);
            throw error;
        }
    }
    
    // Update transaction status
    static async updateStatus(transactionId, status, additionalData = {}) {
        try {
            const updateFields = ['status = ?'];
            const params = [status];
            
            // Add timestamp based on status
            if (status === 'completed' || status === 'failed') {
                updateFields.push('processed_at = NOW()');
            }
            
            // Add additional fields
            Object.keys(additionalData).forEach(key => {
                if (additionalData[key] !== undefined) {
                    updateFields.push(`${key} = ?`);
                    params.push(additionalData[key]);
                }
            });
            
            params.push(transactionId);
            
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE payment_transactions 
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE transaction_id = ?
            `, params);
            
            if (result.affectedRows === 0) {
                throw new Error('Transaction not found');
            }
            
            return await this.getById(transactionId);
        } catch (error) {
            console.error('Error updating transaction status:', error);
            throw error;
        }
    }
    
    // Mark rewards as delivered
    static async markRewardsDelivered(transactionId) {
        try {
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE payment_transactions 
                SET rewards_delivered = 1, delivered_at = NOW(), updated_at = NOW()
                WHERE transaction_id = ? AND status = 'completed'
            `, [transactionId]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error marking rewards as delivered:', error);
            throw error;
        }
    }
    
    // Get user transactions
    static async getUserTransactions(userId, options = {}) {
        try {
            let query = `
                SELECT 
                    t.*,
                    p.name as package_name,
                    p.category as package_category,
                    p.package_type
                FROM payment_transactions t
                LEFT JOIN payment_packages p ON t.package_id = p.package_id
                WHERE t.user_id = ?
            `;
            
            const params = [userId];
            
            // Add status filter
            if (options.status) {
                query += ` AND t.status = ?`;
                params.push(options.status);
            }
            
            // Add date range
            if (options.start_date) {
                query += ` AND t.created_at >= ?`;
                params.push(options.start_date);
            }
            
            if (options.end_date) {
                query += ` AND t.created_at <= ?`;
                params.push(options.end_date);
            }
            
            query += ` ORDER BY t.created_at DESC`;
            
            // Add pagination
            if (options.limit) {
                query += ` LIMIT ?`;
                params.push(parseInt(options.limit));
                
                if (options.offset) {
                    query += ` OFFSET ?`;
                    params.push(parseInt(options.offset));
                }
            }
            
            const [rows] = await db_backoffice.getPool().execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting user transactions:', error);
            throw error;
        }
    }
    
    // Get all transactions (admin)
    static async getAll(options = {}) {
        try {
            let query = `
                SELECT 
                    t.*,
                    p.name as package_name,
                    p.category as package_category,
                    u.username, u.email as user_email_from_users
                FROM payment_transactions t
                LEFT JOIN payment_packages p ON t.package_id = p.package_id
                LEFT JOIN users u ON t.user_id = u.id
                WHERE 1=1
            `;
            
            const params = [];
            
            // Add filters
            if (options.status) {
                query += ` AND t.status = ?`;
                params.push(options.status);
            }
            
            if (options.payment_method) {
                query += ` AND t.payment_method = ?`;
                params.push(options.payment_method);
            }
            
            if (options.package_id) {
                query += ` AND t.package_id = ?`;
                params.push(options.package_id);
            }
            
            if (options.start_date) {
                query += ` AND t.created_at >= ?`;
                params.push(options.start_date);
            }
            
            if (options.end_date) {
                query += ` AND t.created_at <= ?`;
                params.push(options.end_date);
            }
            
            query += ` ORDER BY t.created_at DESC`;
            
            // Add pagination
            if (options.limit) {
                query += ` LIMIT ?`;
                params.push(parseInt(options.limit));
                
                if (options.offset) {
                    query += ` OFFSET ?`;
                    params.push(parseInt(options.offset));
                }
            }
            
            const [rows] = await db_backoffice.getPool().execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting all transactions:', error);
            throw error;
        }
    }
    
    // Get transaction statistics
    static async getStatistics(options = {}) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                    COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_transactions,
                    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
                    AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as average_transaction_value,
                    COUNT(DISTINCT user_id) as unique_buyers
                FROM payment_transactions
                WHERE 1=1
            `;
            
            const params = [];
            
            // Add date filter
            if (options.start_date) {
                query += ` AND created_at >= ?`;
                params.push(options.start_date);
            }
            
            if (options.end_date) {
                query += ` AND created_at <= ?`;
                params.push(options.end_date);
            }
            
            const [stats] = await db_backoffice.getPool().execute(query, params);
            return stats[0];
        } catch (error) {
            console.error('Error getting transaction statistics:', error);
            throw error;
        }
    }
    
    // Get revenue by package
    static async getRevenueByPackage(options = {}) {
        try {
            let query = `
                SELECT 
                    t.package_id,
                    p.name as package_name,
                    p.category,
                    COUNT(*) as transaction_count,
                    SUM(t.amount) as total_revenue,
                    AVG(t.amount) as average_amount
                FROM payment_transactions t
                LEFT JOIN payment_packages p ON t.package_id = p.package_id
                WHERE t.status = 'completed'
            `;
            
            const params = [];
            
            if (options.start_date) {
                query += ` AND t.created_at >= ?`;
                params.push(options.start_date);
            }
            
            if (options.end_date) {
                query += ` AND t.created_at <= ?`;
                params.push(options.end_date);
            }
            
            query += ` GROUP BY t.package_id ORDER BY total_revenue DESC`;
            
            const [rows] = await db_backoffice.getPool().execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting revenue by package:', error);
            throw error;
        }
    }
    
    // Process pending transactions (for background job)
    static async getPendingTransactions(olderThanMinutes = 30) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT * FROM payment_transactions 
                WHERE status = 'pending' 
                AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
                ORDER BY created_at ASC
            `, [olderThanMinutes]);
            
            return rows;
        } catch (error) {
            console.error('Error getting pending transactions:', error);
            throw error;
        }
    }
    
    // Update user purchase history
    static async updateUserPurchaseHistory(transactionId) {
        try {
            const transaction = await this.getById(transactionId);
            if (!transaction || transaction.status !== 'completed') {
                throw new Error('Transaction not completed');
            }
            
            const { user_id, package_id, amount } = transaction;
            
            // Check if user has purchased this package before
            const [existingRows] = await db_backoffice.getPool().execute(`
                SELECT * FROM payment_user_purchases 
                WHERE user_id = ? AND package_id = ?
            `, [user_id, package_id]);
            
            if (existingRows.length > 0) {
                // Update existing record
                await db_backoffice.getPool().execute(`
                    UPDATE payment_user_purchases 
                    SET purchase_count = purchase_count + 1,
                        total_spent = total_spent + ?,
                        last_purchase_at = NOW(),
                        transaction_id = ?
                    WHERE user_id = ? AND package_id = ?
                `, [amount, transactionId, user_id, package_id]);
            } else {
                // Create new record
                await db_backoffice.getPool().execute(`
                    INSERT INTO payment_user_purchases (
                        user_id, package_id, transaction_id, 
                        purchase_count, total_spent
                    ) VALUES (?, ?, ?, 1, ?)
                `, [user_id, package_id, transactionId, amount]);
            }
            
            return true;
        } catch (error) {
            console.error('Error updating user purchase history:', error);
            throw error;
        }
    }
}

module.exports = PaymentTransaction;
