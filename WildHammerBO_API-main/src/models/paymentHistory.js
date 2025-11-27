const db = require('./db_backoffice');
const path = require('path');
require('dotenv').config();

class PaymentHistory {
    // Get all payment history with pagination and filters
    static async getAll(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                username,
                server_id,
                payment_method_types,
                currency,
                start_date,
                end_date,
                is_updated_data,
                sort_by = 'create_at',
                sort_order = 'DESC'
            } = options;

            let query = `
                SELECT 
                    id,
                    CONVERT_TZ(create_at, '+00:00', '+07:00') as create_at,
                    create_by,
                    payment_id,
                    amount,
                    currency,
                    username,
                    server_id,
                    receipt_email,
                    payment_method_types,
                    is_updated_data
                FROM payment_history
                WHERE 1=1
            `;
            
            const params = [];

            // Add filters
            if (username) {
                query += ' AND username LIKE ?';
                params.push(`%${username}%`);
            }

            if (server_id) {
                query += ' AND server_id = ?';
                params.push(server_id);
            }

            if (payment_method_types) {
                query += ' AND payment_method_types = ?';
                params.push(payment_method_types);
            }

            if (currency) {
                query += ' AND currency = ?';
                params.push(currency);
            }

            if (start_date) {
                query += ' AND create_at >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND create_at <= ?';
                params.push(end_date);
            }

            if (is_updated_data !== undefined) {
                query += ' AND is_updated_data = ?';
                params.push(is_updated_data);
            }

            // Add ordering
            query += ` ORDER BY ${sort_by} ${sort_order}`;

            // Add pagination - use string interpolation for LIMIT and OFFSET
            const offset = (page - 1) * limit;
            query += ` LIMIT ${limit} OFFSET ${offset}`;

            const [rows] = await db.getPool().execute(query, params);

            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) as total FROM payment_history WHERE 1=1';
            const countParams = [];

            if (username) {
                countQuery += ' AND username LIKE ?';
                countParams.push(`%${username}%`);
            }

            if (server_id) {
                countQuery += ' AND server_id = ?';
                countParams.push(server_id);
            }

            if (payment_method_types) {
                countQuery += ' AND payment_method_types = ?';
                countParams.push(payment_method_types);
            }

            if (currency) {
                countQuery += ' AND currency = ?';
                countParams.push(currency);
            }

            if (start_date) {
                countQuery += ' AND create_at >= ?';
                countParams.push(start_date);
            }

            if (end_date) {
                countQuery += ' AND create_at <= ?';
                countParams.push(end_date);
            }

            if (is_updated_data !== undefined) {
                countQuery += ' AND is_updated_data = ?';
                countParams.push(is_updated_data);
            }


            const [countResult] = await db.getPool().execute(countQuery, countParams);
            const total = countResult[0].total;

            return {
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting payment history:', error);
            throw error;
        }
    }

    // Get payment history by ID
    static async getById(id) {
        try {
            const [rows] = await db.getPool().execute(`
                SELECT 
                    id,
                    create_at,
                    create_by,
                    payment_id,
                    amount,
                    currency,
                    username,
                    server_id,
                    receipt_email,
                    payment_method_types,
                    is_updated_data
                FROM payment_history
                WHERE id = ?
            `, [id]);

            return rows[0] || null;
        } catch (error) {
            console.error('Error getting payment history by ID:', error);
            throw error;
        }
    }

    // Get payment history by payment_id
    static async getByPaymentId(paymentId) {
        try {
            const [rows] = await db.getPool().execute(`
                SELECT 
                    id,
                    create_at,
                    create_by,
                    payment_id,
                    amount,
                    currency,
                    username,
                    server_id,
                    receipt_email,
                    payment_method_types,
                    is_updated_data
                FROM payment_history
                WHERE payment_id = ?
            `, [paymentId]);

            return rows[0] || null;
        } catch (error) {
            console.error('Error getting payment history by payment ID:', error);
            throw error;
        }
    }

    // Get payment history by username
    static async getByUsername(username, options = {}) {
        try {
            const { page = 1, limit = 20 } = options;
            
            const offset = (page - 1) * limit;
            
            const [rows] = await db.getPool().execute(`
                SELECT 
                    id,
                    create_at,
                    create_by,
                    payment_id,
                    amount,
                    currency,
                    username,
                    server_id,
                    receipt_email,
                    payment_method_types,
                    is_updated_data
                FROM payment_history
                WHERE username = ?
                ORDER BY create_at DESC
                LIMIT ? OFFSET ?
            `, [username, limit, offset]);

            // Get total count
            const [countResult] = await db.getPool().execute(`
                SELECT COUNT(*) as total FROM payment_history WHERE username = ?
            `, [username]);

            const total = countResult[0].total;

            return {
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting payment history by username:', error);
            throw error;
        }
    }

    // Create new payment history record
    static async create(paymentData) {
        try {
            const {
                create_by,
                payment_id,
                amount,
                currency,
                username,
                server_id,
                receipt_email,
                payment_method_types
            } = paymentData;

            const [result] = await db.getPool().execute(`
                INSERT INTO payment_history (
                    create_at,
                    create_by,
                    payment_id,
                    amount,
                    currency,
                    username,
                    server_id,
                    receipt_email,
                    payment_method_types,
                    is_updated_data
                ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [
                create_by,
                payment_id,
                amount,
                currency,
                username,
                server_id,
                receipt_email,
                payment_method_types
            ]);

            return await this.getById(result.insertId);
        } catch (error) {
            console.error('Error creating payment history:', error);
            throw error;
        }
    }

    // Update payment history record
    static async update(id, updateData) {
        try {
            const allowedFields = [
                'amount', 'currency', 'username', 'server_id', 
                'receipt_email', 'payment_method_types', 'is_updated_data'
            ];

            const updates = [];
            const params = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updates.push(`${key} = ?`);
                    params.push(value);
                }
            }

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            params.push(id);

            const [result] = await db.getPool().execute(`
                UPDATE payment_history 
                SET ${updates.join(', ')}
                WHERE id = ?
            `, params);

            if (result.affectedRows === 0) {
                throw new Error('Payment history record not found');
            }

            return await this.getById(id);
        } catch (error) {
            console.error('Error updating payment history:', error);
            throw error;
        }
    }

    // Delete payment history record
    static async delete(id) {
        try {
            const [result] = await db.getPool().execute(`
                DELETE FROM payment_history WHERE id = ?
            `, [id]);

            if (result.affectedRows === 0) {
                throw new Error('Payment history record not found');
            }

            return { success: true, message: 'Payment history record deleted successfully' };
        } catch (error) {
            console.error('Error deleting payment history:', error);
            throw error;
        }
    }

    // Get payment statistics
    static async getStatistics(options = {}) {
        try {
            const { start_date, end_date, server_id, currency } = options;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (start_date) {
                whereClause += ' AND create_at >= ?';
                params.push(start_date);
            }

            if (end_date) {
                whereClause += ' AND create_at <= ?';
                params.push(end_date);
            }

            if (server_id) {
                whereClause += ' AND server_id = ?';
                params.push(server_id);
            }

            if (currency) {
                whereClause += ' AND currency = ?';
                params.push(currency);
            }

            const [stats] = await db.getPool().execute(`
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount,
                    COUNT(DISTINCT username) as unique_users,
                    COUNT(DISTINCT server_id) as unique_servers,
                    COUNT(CASE WHEN is_updated_data = 1 THEN 1 END) as updated_transactions,
                    COUNT(CASE WHEN is_updated_data = 0 THEN 1 END) as pending_transactions
                FROM payment_history
                ${whereClause}
            `, params);

            // Get payment method breakdown
            const [paymentMethods] = await db.getPool().execute(`
                SELECT 
                    payment_method_types,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM payment_history
                ${whereClause}
                GROUP BY payment_method_types
                ORDER BY count DESC
            `, params);

            // Get currency breakdown
            const [currencies] = await db.getPool().execute(`
                SELECT 
                    currency,
                    COUNT(*) as count,
                    SUM(amount) as total_amount
                FROM payment_history
                ${whereClause}
                GROUP BY currency
                ORDER BY count DESC
            `, params);

            return {
                total_transactions: stats[0].total_transactions || 0,
                total_revenue: parseFloat(stats[0].total_amount) || 0,
                average_amount: parseFloat(stats[0].average_amount) || 0,
                min_amount: parseFloat(stats[0].min_amount) || 0,
                max_amount: parseFloat(stats[0].max_amount) || 0,
                unique_users: stats[0].unique_users || 0,
                unique_servers: stats[0].unique_servers || 0,
                updated_transactions: stats[0].updated_transactions || 0,
                pending_transactions: stats[0].pending_transactions || 0,
                payment_methods: paymentMethods,
                currencies: currencies
            };
        } catch (error) {
            console.error('Error getting payment statistics:', error);
            throw error;
        }
    }
}

module.exports = PaymentHistory;
