const db_backoffice = require('./db_backoffice');

class DailyRewardClaimModel {
    /**
     * Check if user has claimed reward for specific day
     */
    static async hasClaimed(roleid, dayNumber) {
        try {
            const query = `
                SELECT id, claimed_at 
                FROM daily_reward_claims 
                WHERE roleid = ? AND day_number = ?
            `;
            
            const [rows] = await db_backoffice.execute(query, [roleid, dayNumber]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.hasClaimed:', error);
            throw error;
        }
    }

    /**
     * Get user's claim history
     */
    static async getUserClaims(roleid, limit = 30, offset = 0) {
        try {
            
            
            const limitValue = parseInt(limit) || 30;
            const offsetValue = parseInt(offset) || 0;
            
            const query = `
                SELECT drc.*, dr.reward_items, dr.reward_equipment, dr.reward_tokens
                FROM daily_reward_claims drc
                LEFT JOIN daily_rewards dr ON drc.day_number = dr.day_number
                WHERE drc.roleid = ?
                ORDER BY drc.claimed_at DESC
                LIMIT ${limitValue} OFFSET ${offsetValue}
            `;
            
            
            const [rows] = await db_backoffice.execute(query, [roleid]);
            
            // Parse JSON fields
            return rows.map(row => ({
                ...row,
                reward_items: row.reward_items ? JSON.parse(row.reward_items) : [],
                reward_equipment: row.reward_equipment ? JSON.parse(row.reward_equipment) : []
            }));
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.getUserClaims:', error);
            throw error;
        }
    }

    /**
     * Get user's current progress (consecutive days claimed)
     */
    static async getUserProgress(roleid) {
        try {
            const query = `
                SELECT 
                    MAX(day_number) as last_claimed_day,
                    COUNT(*) as total_claims,
                    (SELECT COUNT(*) FROM daily_rewards WHERE is_active = 1) as total_available_days
                FROM daily_reward_claims 
                WHERE roleid = ?
            `;
            
            const [rows] = await db_backoffice.execute(query, [roleid]);
            return rows[0];
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.getUserProgress:', error);
            throw error;
        }
    }

    /**
     * Claim daily reward
     */
    static async claimReward(roleid, dayNumber, rewardData, claimData = {}) {
        const pool = db_backoffice.getPool();
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Check if already claimed
            const existingClaim = await this.hasClaimed(roleid, dayNumber);
            if (existingClaim) {
                throw new Error('Reward already claimed for this day');
            }
            
            // Insert claim record
            const query = `
                INSERT INTO daily_reward_claims (
                    roleid, day_number, reward_items, reward_equipment, reward_tokens,
                    ip_address, user_agent, serverid
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(query, [
                roleid,
                dayNumber,
                JSON.stringify(rewardData.reward_items || []),
                JSON.stringify(rewardData.reward_equipment || []),
                rewardData.reward_tokens || 0.00,
                claimData.ip_address || null,
                claimData.user_agent || null,
                claimData.serverid || 0
            ]);
            
            await connection.commit();
            
            return {
                success: true,
                data: {
                    claim_id: result.insertId,
                    roleid: roleid,
                    day_number: dayNumber,
                    claimed_at: new Date(),
                    rewards: rewardData
                }
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error in DailyRewardClaimModel.claimReward:', error);
            return {
                success: false,
                message: error.message || 'Failed to claim reward'
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Get claim statistics
     */
    static async getClaimStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_claims,
                    COUNT(DISTINCT roleid) as unique_claimers,
                    COUNT(DISTINCT day_number) as days_with_claims,
                    DATE(claimed_at) as claim_date,
                    COUNT(*) as daily_claims
                FROM daily_reward_claims 
                GROUP BY DATE(claimed_at)
                ORDER BY claim_date DESC
                LIMIT 30
            `;
            
            const [rows] = await db_backoffice.execute(query);
            return rows;
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.getClaimStatistics:', error);
            throw error;
        }
    }

    /**
     * Get top claimers
     */
    static async getTopClaimers(limit = 10) {
        try {
            const query = `
                SELECT 
                    roleid,
                    COUNT(*) as total_claims,
                    MAX(claimed_at) as last_claim,
                    SUM(reward_tokens) as total_tokens_earned
                FROM daily_reward_claims 
                GROUP BY roleid
                ORDER BY total_claims DESC, total_tokens_earned DESC
                LIMIT ?
            `;
            
            const [rows] = await db_backoffice.execute(query, [limit]);
            return rows;
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.getTopClaimers:', error);
            throw error;
        }
    }

    /**
     * Delete claim record (admin only)
     */
    static async deleteClaim(claimId) {
        try {
            const query = 'DELETE FROM daily_reward_claims WHERE id = ?';
            const [result] = await db_backoffice.execute(query, [claimId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.deleteClaim:', error);
            throw error;
        }
    }

    /**
     * Get all claims with pagination (admin)
     */
    static async getAllClaims(filters = {}, limit = 50, offset = 0) {
        try {
            let query = `
                SELECT drc.*, dr.reward_items, dr.reward_equipment, dr.reward_tokens
                FROM daily_reward_claims drc
                LEFT JOIN daily_rewards dr ON drc.day_number = dr.day_number
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.roleid) {
                query += ' AND drc.roleid = ?';
                params.push(filters.roleid);
            }
            
            if (filters.day_number) {
                query += ' AND drc.day_number = ?';
                params.push(filters.day_number);
            }
            
            if (filters.date_from) {
                query += ' AND DATE(drc.claimed_at) >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND DATE(drc.claimed_at) <= ?';
                params.push(filters.date_to);
            }
            
            const limitValue = parseInt(limit) || 50;
            const offsetValue = parseInt(offset) || 0;
            
            query += ` ORDER BY drc.claimed_at DESC LIMIT ${limitValue} OFFSET ${offsetValue}`;
            
            const [rows] = await db_backoffice.execute(query, params);
            
            // Parse JSON fields
            return rows.map(row => ({
                ...row,
                reward_items: row.reward_items ? JSON.parse(row.reward_items) : [],
                reward_equipment: row.reward_equipment ? JSON.parse(row.reward_equipment) : []
            }));
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.getAllClaims:', error);
            throw error;
        }
    }

    /**
     * Delete a claim record (for rollback)
     */
    static async deleteClaim(claimId) {
        try {
            const query = `DELETE FROM daily_reward_claims WHERE id = ?`;
            const [result] = await db_backoffice.execute(query, [claimId]);
            
            if (result.affectedRows === 0) {
                return {
                    success: false,
                    message: 'Claim not found'
                };
            }
            
            return {
                success: true,
                message: 'Claim deleted successfully',
                data: {
                    id: claimId,
                    affectedRows: result.affectedRows
                }
            };
        } catch (error) {
            console.error('Error in DailyRewardClaimModel.deleteClaim:', error);
            throw error;
        }
    }
}

module.exports = DailyRewardClaimModel;
