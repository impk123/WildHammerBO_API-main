const db_backoffice = require('./db_backoffice');

class DailyRewardModel {
    /**
     * Get all daily rewards
     */
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT dr.*, 
                       (SELECT COUNT(*) FROM daily_reward_claims drc WHERE drc.day_number = dr.day_number) as total_claims
                FROM daily_rewards dr
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.is_active !== undefined) {
                query += ' AND dr.is_active = ?';
                params.push(filters.is_active);
            }
            
            if (filters.day_number) {
                query += ' AND dr.day_number = ?';
                params.push(filters.day_number);
            }
            
            query += ' ORDER BY dr.day_number ASC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(filters.limit));
                
                if (filters.offset) {
                    query += ' OFFSET ?';
                    params.push(parseInt(filters.offset));
                }
            }
            
            const [rows] = await db_backoffice.execute(query, params);
            
            // Parse JSON fields
            return rows.map(row => ({
                ...row,
                reward_items: row.reward_items ? JSON.parse(row.reward_items) : [],
                reward_equipment: row.reward_equipment ? JSON.parse(row.reward_equipment) : []
            }));
        } catch (error) {
            console.error('Error in DailyRewardModel.findAll:', error);
            throw error;
        }
    }

    /**
     * Get daily reward by day number
     */
    static async findByDayNumber(dayNumber) {
        try {
            const query = `
                SELECT dr.*, 
                       (SELECT COUNT(*) FROM daily_reward_claims drc WHERE drc.day_number = dr.day_number) as total_claims
                FROM daily_rewards dr
                WHERE dr.day_number = ?
            `;
            
            const [rows] = await db_backoffice.execute(query, [dayNumber]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const row = rows[0];
            return {
                ...row,
                reward_items: row.reward_items ? JSON.parse(row.reward_items) : [],
                reward_equipment: row.reward_equipment ? JSON.parse(row.reward_equipment) : []
            };
        } catch (error) {
            console.error('Error in DailyRewardModel.findByDayNumber:', error);
            throw error;
        }
    }

    /**
     * Create daily reward
     */
    static async create(rewardData) {
        try {
            const {
                day_number, reward_items, reward_equipment, reward_tokens, is_active
            } = rewardData;

            const query = `
                INSERT INTO daily_rewards (
                    day_number, reward_items, reward_equipment, reward_tokens, is_active
                ) VALUES (?, ?, ?, ?, ?)
            `;

            const params = [
                day_number,
                JSON.stringify(reward_items || []),
                JSON.stringify(reward_equipment || []),
                reward_tokens || 0.00,
                is_active !== undefined ? is_active : 1
            ];

            const [result] = await db_backoffice.execute(query, params);
            return result.insertId;
        } catch (error) {
            console.error('Error in DailyRewardModel.create:', error);
            throw error;
        }
    }

    /**
     * Update daily reward
     */
    static async update(dayNumber, rewardData) {
        try {
            const fields = [];
            const params = [];

            Object.keys(rewardData).forEach(key => {
                if (rewardData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    
                    // Handle JSON fields
                    if (key === 'reward_items' || key === 'reward_equipment') {
                        params.push(JSON.stringify(rewardData[key] || []));
                    } else {
                        params.push(rewardData[key]);
                    }
                }
            });

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(dayNumber);

            const query = `UPDATE daily_rewards SET ${fields.join(', ')} WHERE day_number = ?`;
            const [result] = await db_backoffice.execute(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in DailyRewardModel.update:', error);
            throw error;
        }
    }

    /**
     * Delete daily reward
     */
    static async delete(dayNumber) {
        try {
            const query = 'DELETE FROM daily_rewards WHERE day_number = ?';
            const [result] = await db_backoffice.execute(query, [dayNumber]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in DailyRewardModel.delete:', error);
            throw error;
        }
    }

    /**
     * Toggle active status
     */
    static async toggleActiveStatus(dayNumber) {
        try {
            const query = `
                UPDATE daily_rewards 
                SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
                WHERE day_number = ?
            `;
            const [result] = await db_backoffice.execute(query, [dayNumber]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in DailyRewardModel.toggleActiveStatus:', error);
            throw error;
        }
    }

    /**
     * Create multiple daily rewards (for bulk creation)
     */
    static async createMultiple(rewardsData) {
        const pool = db_backoffice.getPool();
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const insertPromises = rewardsData.map(reward => {
                const {
                    day_number, reward_items, reward_equipment, reward_tokens, is_active
                } = reward;

                const query = `
                    INSERT INTO daily_rewards (
                        day_number, reward_items, reward_equipment, reward_tokens, is_active
                    ) VALUES (?, ?, ?, ?, ?)
                `;

                const params = [
                    day_number,
                    JSON.stringify(reward_items || []),
                    JSON.stringify(reward_equipment || []),
                    reward_tokens || 0.00,
                    is_active !== undefined ? is_active : 1
                ];

                return connection.execute(query, params);
            });

            await Promise.all(insertPromises);
            await connection.commit();
            
            return { success: true, message: 'Daily rewards created successfully' };
        } catch (error) {
            await connection.rollback();
            console.error('Error in DailyRewardModel.createMultiple:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Copy rewards from one cycle to another
     */
    static async copyRewards(fromStartDate, fromEndDate, toStartDate, totalDays) {
        const pool = db_backoffice.getPool();
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get source rewards
            const sourceQuery = `
                SELECT day_number, reward_items, reward_equipment, reward_tokens, is_active
                FROM daily_rewards 
                WHERE day_number BETWEEN ? AND ?
                ORDER BY day_number ASC
            `;
            
            const [sourceRows] = await connection.execute(sourceQuery, [fromStartDate, fromEndDate]);
            
            if (sourceRows.length === 0) {
                throw new Error('No source rewards found for the specified date range');
            }
            
            // Clear existing rewards
            await connection.execute('DELETE FROM daily_rewards');
            
            // Insert new rewards
            const insertPromises = sourceRows.map((row, index) => {
                const newDayNumber = index + 1;
                
                const query = `
                    INSERT INTO daily_rewards (
                        day_number, reward_items, reward_equipment, reward_tokens, is_active
                    ) VALUES (?, ?, ?, ?, ?)
                `;
                
                return connection.execute(query, [
                    newDayNumber,
                    row.reward_items,
                    row.reward_equipment,
                    row.reward_tokens,
                    row.is_active
                ]);
            });
            
            await Promise.all(insertPromises);
            
            // Update cycle information
            const cycleQuery = `
                UPDATE daily_reward_cycles 
                SET start_date = ?, end_date = DATE_ADD(?, INTERVAL ? DAY), total_days = ?, updated_at = CURRENT_TIMESTAMP
                WHERE is_active = 1
            `;
            
            await connection.execute(cycleQuery, [toStartDate, toStartDate, totalDays - 1, totalDays]);
            
            await connection.commit();
            
            return { 
                success: true, 
                message: `Successfully copied ${sourceRows.length} rewards to new cycle`,
                copied_rewards: sourceRows.length
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error in DailyRewardModel.copyRewards:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Create cycle
     */
    static async createCycle(cycleData) {
        try {
            const {
                cycle_name, start_date, end_date, total_days, is_active
            } = cycleData;

            const query = `
                INSERT INTO daily_reward_cycles (
                    cycle_name, start_date, end_date, total_days, is_active
                ) VALUES (?, ?, ?, ?, ?)
            `;

            const params = [
                cycle_name,
                start_date,
                end_date,
                total_days,
                is_active !== undefined ? is_active : 1
            ];

            const [result] = await db_backoffice.execute(query, params);
            return result.insertId;
        } catch (error) {
            console.error('Error in DailyRewardModel.createCycle:', error);
            throw error;
        }
    }

    /**
     * Get current active cycle
     */
    static async getCurrentCycle() {
        try {
            const query = `
                SELECT * FROM daily_reward_cycles 
                WHERE is_active = 1 
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            
            const [rows] = await db_backoffice.execute(query);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in DailyRewardModel.getCurrentCycle:', error);
            throw error;
        }
    }

    /**
     * Get all cycles
     */
    static async getAllCycles() {
        try {
            const query = `
                SELECT * FROM daily_reward_cycles 
                ORDER BY created_at DESC
            `;
            
            const [rows] = await db_backoffice.execute(query);
            return rows;
        } catch (error) {
            console.error('Error in DailyRewardModel.getAllCycles:', error);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    static async getStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_rewards,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_rewards,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_rewards,
                    SUM(reward_tokens) as total_tokens,
                    AVG(reward_tokens) as average_tokens,
                    (SELECT COUNT(*) FROM daily_reward_claims) as total_claims,
                    (SELECT COUNT(DISTINCT roleid) FROM daily_reward_claims) as unique_claimers
                FROM daily_rewards
            `;
            
            const [rows] = await db_backoffice.execute(query);
            return rows[0];
        } catch (error) {
            console.error('Error in DailyRewardModel.getStatistics:', error);
            throw error;
        }
    }
}

module.exports = DailyRewardModel;
