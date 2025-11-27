const db_backoffice = require('./db_backoffice');

class PrizeByRank {
    // Get all prize by rank records
    static async getAll(options = {}) {
        try {
            let query = `
                SELECT * FROM prize_by_rank 
                WHERE 1=1
            `;
            const params = [];
            
                // Add serverid filter
            if (options.serverid) {
                query += ` AND serverid = ?`;
                params.push(options.serverid);
            }
            
            // Add filters
            if (options.from_rank) {
                query += ` AND from_rank >= ?`;
                params.push(options.from_rank);
            }
            
            if (options.to_rank) {
                query += ` AND to_rank <= ?`;
                params.push(options.to_rank);
            }
            
            if (options.min_percent) {
                query += ` AND percent_prize >= ?`;
                params.push(options.min_percent);
            }
            
            if (options.max_percent) {
                query += ` AND percent_prize <= ?`;
                params.push(options.max_percent);
            }

            if (options.serverid) {
                query += ` AND serverid = ?`;
                params.push(options.serverid);
            }
            
            // Add ordering
            query += ` ORDER BY serverid ASC, from_rank ASC, to_rank ASC`;
            
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
            console.error('Error getting prize by rank records:', error);
            throw error;
        }
    }
    
    // Get prize by rank by ID and serverid
    static async getById(id) {
        try {
            let query = `SELECT * FROM prize_by_rank WHERE id = ?`;
            const params = [id];
                      
            const [rows] = await db_backoffice.getPool().execute(query, params);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting prize by rank by ID:', error);
            throw error;
        }
    }

    static async getByServerId(serverid) {
        try {
            let query = `SELECT * FROM prize_by_rank WHERE serverid = ?`;
            const params = [serverid];
                      
            const [rows] = await db_backoffice.getPool().execute(query, params);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting prize by rank by ID:', error);
            throw error;
        }
    }
    
    // Get prize by rank by rank range and serverid
    static async getByRankRange(fromRank, toRank, serverid) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT * FROM prize_by_rank 
                WHERE from_rank = ? AND to_rank = ? AND serverid = ?
            `, [fromRank, toRank, serverid]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting prize by rank by range:', error);
            throw error;
        }
    }
    
    // Create new prize by rank record
    static async create(prizeData) {
        try {
            const {
                serverid,
                from_rank,
                to_rank,
                percent_prize
            } = prizeData;
            
            // Check if rank range already exists for this server
            const existing = await this.getByRankRange(from_rank, to_rank, serverid);
            if (existing) {
                throw new Error(`Rank range ${from_rank}-${to_rank} already exists for server ${serverid}`);
            }
            
            // Validate rank range
            if (from_rank > to_rank) {
                throw new Error('from_rank cannot be greater than to_rank');
            }
            
            const [result] = await db_backoffice.getPool().execute(`
                INSERT INTO prize_by_rank (serverid, from_rank, to_rank, percent_prize)
                VALUES (?, ?, ?, ?)
            `, [serverid, from_rank, to_rank, percent_prize]);
            
            return await this.getByServerId(serverid);
        } catch (error) {
            console.error('Error creating prize by rank:', error);
            throw error;
        }
    }
    
    // Update prize by rank record
    static async update(id, updateData) {
        try {
            const updates = [];
            const params = [];
            
            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== 'id') {
                    updates.push(`${key} = ?`);
                    params.push(updateData[key]);
                }
            });
            
            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // If updating rank range, check for conflicts
            if (updateData.from_rank !== undefined || updateData.to_rank !== undefined) {
                const current = await this.getById(id);
                if (!current) {
                    throw new Error('Prize by rank record not found');
                }
                
                const newFromRank = updateData.from_rank !== undefined ? updateData.from_rank : current.from_rank;
                const newToRank = updateData.to_rank !== undefined ? updateData.to_rank : current.to_rank;
                
                if (newFromRank > newToRank) {
                    throw new Error('from_rank cannot be greater than to_rank');
                }
              
            }
            
            params.push(id);
            
            const [result] = await db_backoffice.getPool().execute(`
                UPDATE prize_by_rank 
                SET ${updates.join(', ')}
                WHERE id = ?
            `, params);
            
            if (result.affectedRows === 0) {
                throw new Error('Prize by rank record not found');
            }
            
            return await this.getById(id);
        } catch (error) {
            console.error('Error updating prize by rank:', error);
            throw error;
        }
    }
    
    // Delete prize by rank record
    static async delete(id) {
        try {
            const [result] = await db_backoffice.getPool().execute(`
                DELETE FROM prize_by_rank WHERE id = ?
            `, [id]);
            
            if (result.affectedRows === 0) {
                throw new Error('Prize by rank record not found');
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting prize by rank:', error);
            throw error;
        }
    }
    
    // Get prize percentage for a specific rank
    static async getPrizeForRank(rank) {
        try {
            const [rows] = await db_backoffice.getPool().execute(`
                SELECT * FROM prize_by_rank 
                WHERE ? BETWEEN from_rank AND to_rank
                ORDER BY from_rank ASC
                LIMIT 1
            `, [rank]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return rows[0];
        } catch (error) {
            console.error('Error getting prize for rank:', error);
            throw error;
        }
    }
    
    // Get statistics
    static async getStatistics() {
        try {
            const [stats] = await db_backoffice.getPool().execute(`
                SELECT 
                    COUNT(*) as total_records,
                    MIN(from_rank) as min_rank,
                    MAX(to_rank) as max_rank,
                    AVG(percent_prize) as avg_percent,
                    MIN(percent_prize) as min_percent,
                    MAX(percent_prize) as max_percent
                FROM prize_by_rank
            `);
            
            return stats[0];
        } catch (error) {
            console.error('Error getting prize by rank statistics:', error);
            throw error;
        }
    }
    
    // Check for rank range overlaps
    static async checkOverlaps() {
        try {
            const [overlaps] = await db_backoffice.getPool().execute(`
                SELECT 
                    a.id as id1,
                    a.from_rank as from1,
                    a.to_rank as to1,
                    b.id as id2,
                    b.from_rank as from2,
                    b.to_rank as to2
                FROM prize_by_rank a
                JOIN prize_by_rank b ON a.id < b.id
                WHERE NOT (a.to_rank < b.from_rank OR a.from_rank > b.to_rank)
                ORDER BY a.from_rank, b.from_rank
            `);
            
            return overlaps;
        } catch (error) {
            console.error('Error checking rank overlaps:', error);
            throw error;
        }
    }
    
    // Get summary of prize by rank with prize setting data
    static async getSummaryPrizeByRank(serverid) {
        try {
            // Get prize setting data for specific server
            const [prizeSettingRows] = await db_backoffice.getPool().execute(`
                SELECT * FROM prize_setting WHERE serverid = ?
            `, [serverid]);
            
            if (prizeSettingRows.length === 0) {
                throw new Error(`Prize setting not found for server ${serverid}`);
            }
            
            const prizeSetting = prizeSettingRows[0];
            
            // Calculate total prize pool
            const totalPrizePool = parseFloat(prizeSetting.initial_prize) + parseFloat(prizeSetting.addon_prize);
            
            // Get all prize by rank records for specific server
            const [prizeByRankRows] = await db_backoffice.getPool().execute(`
                SELECT * FROM prize_by_rank 
                WHERE serverid = ?
                ORDER BY from_rank ASC, to_rank ASC
            `, [serverid]);
            
            // Calculate total percentage
            const totalPercentage = prizeByRankRows.reduce((sum, row) => sum + parseFloat(row.percent_prize), 0);
            
            // Format rank display and calculate prize amounts
            const prizeByRankData = prizeByRankRows.map(row => {
                const fromRank = parseInt(row.from_rank);
                const toRank = parseInt(row.to_rank);
                const percentPrize = parseFloat(row.percent_prize);
                const prizeAmount = (totalPrizePool * percentPrize) / 100;
                
                // Format rank display
                let rankDisplay;
                if (fromRank === toRank) {
                    rankDisplay = fromRank.toString();
                } else {
                    rankDisplay = `${fromRank}-${toRank}`;
                }
                
                return {
                    id: row.id,
                    serverid: row.serverid,
                    rank: rankDisplay,
                    from_rank: fromRank,
                    to_rank: toRank,
                    percent_prize: percentPrize,
                    prize_amount: prizeAmount
                };
            });
            
            return {
                serverid: serverid,
                prize_setting: {
                    initial_prize: parseFloat(prizeSetting.initial_prize),
                    tota_buytoken: parseFloat(prizeSetting.tota_buytoken),
                    percent_addon: parseFloat(prizeSetting.percent_addon),
                    addon_prize: parseFloat(prizeSetting.addon_prize),
                    total_prize_pool: totalPrizePool
                },
                prize_by_rank: prizeByRankData,
                summary: {
                    total_percentage: totalPercentage,
                    is_complete: Math.abs(totalPercentage - 100) < 0.01, // Allow small floating point differences
                    total_records: prizeByRankRows.length
                }
            };
        } catch (error) {
            console.error('Error getting summary prize by rank:', error);
            throw error;
        }
    }
}

module.exports = PrizeByRank;
