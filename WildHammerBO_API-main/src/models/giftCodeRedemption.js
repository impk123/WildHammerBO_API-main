const db_backoffice = require('./db_backoffice');

class GiftCodeRedemptionModel {
    // Record a gift code redemption attempt
    static async create(redemptionData) {
        const pool = db_backoffice.getPool();
        
        const query = `
            INSERT INTO gift_code_redemptions (
                gift_code_id, user_id, user_email, redemption_status, 
                rewards_given, ip_address, user_agent, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        try {
            const [result] = await pool.execute(query, [
                redemptionData.gift_code_id,
                redemptionData.user_id,
                redemptionData.user_email || null,
                redemptionData.redemption_status,
                JSON.stringify(redemptionData.rewards_given || {}),
                redemptionData.ip_address || null,
                redemptionData.user_agent || null,
                redemptionData.error_message || null
            ]);
            
            return await GiftCodeRedemptionModel.findById(result.insertId);
        } catch (error) {
            console.error('Error creating gift code redemption:', error);
            throw error;
        }
    }

    // Find redemption by ID
    static async findById(id) {
        const pool = db_backoffice.getPool();
        
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM gift_code_redemptions WHERE id = ?',
                [id]
            );
            
            if (rows.length > 0) {
                return GiftCodeRedemptionModel._formatRedemption(rows[0]);
            }
            return null;
        } catch (error) {
            console.error('Error finding redemption by ID:', error);
            throw error;
        }
    }

    // Get redemptions for a specific user
    static async findByUserId(userId, options = {}) {
        const pool = db_backoffice.getPool();
        const { page = 1, limit = 20 } = options;
        
        let query = `
            SELECT gcr.*, gc.code, gc.title, gc.type 
            FROM gift_code_redemptions gcr
            JOIN gift_codes gc ON gcr.gift_code_id = gc.id
            WHERE gcr.user_id = ?
            ORDER BY gcr.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const offset = (page - 1) * limit;
        
        try {
            const [rows] = await pool.execute(query, [userId, limit, offset]);
            const [countRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM gift_code_redemptions WHERE user_id = ?',
                [userId]
            );
            
            return {
                data: rows.map(row => ({
                    ...GiftCodeRedemptionModel._formatRedemption(row),
                    gift_code: {
                        code: row.code,
                        title: row.title,
                        type: row.type
                    }
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countRows[0].total,
                    totalPages: Math.ceil(countRows[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error finding redemptions by user ID:', error);
            throw error;
        }
    }

    // Get redemptions for a specific gift code
    static async findByGiftCodeId(giftCodeId, options = {}) {
        const pool = db_backoffice.getPool();
        const { page = 1, limit = 20, status = null } = options;
        
        let query = `
            SELECT gcr.*, u.name as user_name, u.email as user_email
            FROM gift_code_redemptions gcr
            LEFT JOIN users u ON gcr.user_id = u.id
            WHERE gcr.gift_code_id = ?
        `;
        
        const params = [giftCodeId];
        
        if (status) {
            query += ' AND gcr.redemption_status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY gcr.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);
        
        try {
            const [rows] = await pool.execute(query, params);
            
            let countQuery = 'SELECT COUNT(*) as total FROM gift_code_redemptions WHERE gift_code_id = ?';
            const countParams = [giftCodeId];
            
            if (status) {
                countQuery += ' AND redemption_status = ?';
                countParams.push(status);
            }
            
            const [countRows] = await pool.execute(countQuery, countParams);
            
            return {
                data: rows.map(row => ({
                    ...GiftCodeRedemptionModel._formatRedemption(row),
                    user: {
                        name: row.user_name,
                        email: row.user_email
                    }
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countRows[0].total,
                    totalPages: Math.ceil(countRows[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error finding redemptions by gift code ID:', error);
            throw error;
        }
    }

    // Get redemption statistics
    static async getStats(options = {}) {
        const pool = db_backoffice.getPool();
        const { startDate = null, endDate = null, giftCodeId = null } = options;
        
        let query = `
            SELECT 
                COUNT(*) as total_redemptions,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT gift_code_id) as unique_codes,
                SUM(CASE WHEN redemption_status = 'success' THEN 1 ELSE 0 END) as successful_redemptions,
                SUM(CASE WHEN redemption_status = 'failed' THEN 1 ELSE 0 END) as failed_redemptions,
                DATE(created_at) as redemption_date
            FROM gift_code_redemptions 
            WHERE 1=1
        `;
        
        const params = [];
        
        if (startDate) {
            query += ' AND created_at >= ?';
            params.push(startDate);
        }
        
        if (endDate) {
            query += ' AND created_at <= ?';
            params.push(endDate);
        }
        
        if (giftCodeId) {
            query += ' AND gift_code_id = ?';
            params.push(giftCodeId);
        }
        
        query += ' GROUP BY DATE(created_at) ORDER BY redemption_date DESC';
        
        try {
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error getting redemption stats:', error);
            throw error;
        }
    }

    // Get recent redemptions
    static async getRecent(limit = 10) {
        const pool = db_backoffice.getPool();
        
        try {
            const [rows] = await pool.execute(`
                SELECT gcr.*, gc.code, gc.title, u.name as user_name, u.email as user_email
                FROM gift_code_redemptions gcr
                JOIN gift_codes gc ON gcr.gift_code_id = gc.id
                LEFT JOIN users u ON gcr.user_id = u.id
                ORDER BY gcr.created_at DESC
                LIMIT ?
            `, [limit]);
            
            return rows.map(row => ({
                ...GiftCodeRedemptionModel._formatRedemption(row),
                gift_code: {
                    code: row.code,
                    title: row.title
                },
                user: {
                    name: row.user_name,
                    email: row.user_email
                }
            }));
        } catch (error) {
            console.error('Error getting recent redemptions:', error);
            throw error;
        }
    }

    // Check if user has already redeemed a specific gift code
    static async hasUserRedeemed(giftCodeId, userId) {
        const pool = db_backoffice.getPool();
        
        try {
            const [rows] = await pool.execute(`
                SELECT COUNT(*) as count 
                FROM gift_code_redemptions 
                WHERE gift_code_id = ? AND user_id = ? AND redemption_status = 'success'
            `, [giftCodeId, userId]);
            
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error checking user redemption:', error);
            throw error;
        }
    }

    // Format redemption data
    static _formatRedemption(row) {
        return {
            id: row.id,
            gift_code_id: row.gift_code_id,
            user_id: row.user_id,
            user_email: row.user_email,
            redemption_status: row.redemption_status,
            rewards_given: JSON.parse(row.rewards_given || '{}'),
            ip_address: row.ip_address,
            user_agent: row.user_agent,
            error_message: row.error_message,
            created_at: row.created_at
        };
    }
}

module.exports = GiftCodeRedemptionModel;
