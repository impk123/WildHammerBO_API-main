const PrizeByRank = require('../models/prizeByRank');

class PrizeByRankService {
    // Get all prize by rank records
    static async getAllPrizeByRank(options = {}) {
        try {
            const records = await PrizeByRank.getAll(options);
            
            return {
                success: true,
                data: records,
                count: records.length
            };
        } catch (error) {
            console.error('Error getting all prize by rank records:', error);
            throw error;
        }
    }
    
    // Get prize by rank by ID
    static async getPrizeByRankById(id) {
        try {
            const record = await PrizeByRank.getById(id);
            
            if (!record) {
                throw new Error('Prize by rank record not found');
            }
            
            return {
                success: true,
                data: record
            };
        } catch (error) {
            console.error('Error getting prize by rank by ID:', error);
            throw error;
        }
    }
    
    // Create new prize by rank record
    static async createPrizeByRank(prizeData) {
        try {
            // Validate required fields
            const requiredFields = ['from_rank', 'to_rank', 'percent_prize'];
            for (const field of requiredFields) {
                if (prizeData[field] === undefined || prizeData[field] === null) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Validate data types and values
            if (!Number.isInteger(prizeData.from_rank) || prizeData.from_rank < 1) {
                throw new Error('from_rank must be a positive integer');
            }
            
            if (!Number.isInteger(prizeData.to_rank) || prizeData.to_rank < 1) {
                throw new Error('to_rank must be a positive integer');
            }
            
            if (typeof prizeData.percent_prize !== 'number' || prizeData.percent_prize < 0) {
                throw new Error('percent_prize must be a non-negative number');
            }
            
            const newRecord = await PrizeByRank.create(prizeData);
            
            
            return {
                success: true,
                data: newRecord,
                message: 'Prize by rank record created successfully'
            };
        } catch (error) {
            console.error('Error creating prize by rank:', error);
            throw error;
        }
    }
    
    // Update prize by rank record
    static async updatePrizeByRank(id, updateData) {
        try {
            // Validate data types if provided
            if (updateData.from_rank !== undefined) {
                if (!Number.isInteger(updateData.from_rank) || updateData.from_rank < 1) {
                    throw new Error('from_rank must be a positive integer');
                }
            }
            
            if (updateData.to_rank !== undefined) {
                if (!Number.isInteger(updateData.to_rank) || updateData.to_rank < 1) {
                    throw new Error('to_rank must be a positive integer');
                }
            }
            
            if (updateData.percent_prize !== undefined) {
                if (typeof updateData.percent_prize !== 'number' || updateData.percent_prize < 0) {
                    throw new Error('percent_prize must be a non-negative number');
                }
            }

            if (updateData.serverid !== undefined) {
                if (!Number.isInteger(updateData.serverid) || updateData.serverid < 1) {
                    throw new Error('serverid must be a positive integer');
                }
            }
            
            const updatedRecord = await PrizeByRank.update(id, updateData);
            
            
            return {
                success: true,
                data: updatedRecord,
                message: 'Prize by rank record updated successfully'
            };
        } catch (error) {
            console.error('Error updating prize by rank:', error);
            throw error;
        }
    }
    
    // Delete prize by rank record
    static async deletePrizeByRank(id) {
        try {
            const success = await PrizeByRank.delete(id);
            
            console.log(`Prize by rank deleted for ID ${id}`);
            
            return {
                success: true,
                message: 'Prize by rank record deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting prize by rank:', error);
            throw error;
        }
    }
    
    // Get prize percentage for a specific rank
    static async getPrizeForRank(rank) {
        try {
            if (!Number.isInteger(rank) || rank < 1) {
                throw new Error('Rank must be a positive integer');
            }
            
            const record = await PrizeByRank.getPrizeForRank(rank);
            
            if (!record) {
                return {
                    success: true,
                    data: null,
                    message: `No prize configuration found for rank ${rank}`
                };
            }
            
            return {
                success: true,
                data: record,
                message: `Prize configuration found for rank ${rank}`
            };
        } catch (error) {
            console.error('Error getting prize for rank:', error);
            throw error;
        }
    }
    
    // Get statistics
    static async getStatistics() {
        try {
            const stats = await PrizeByRank.getStatistics();
            
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error getting prize by rank statistics:', error);
            throw error;
        }
    }
    
    // Check for rank range overlaps
    static async checkOverlaps() {
        try {
            const overlaps = await PrizeByRank.checkOverlaps();
            
            return {
                success: true,
                data: overlaps,
                count: overlaps.length,
                message: overlaps.length > 0 ? 
                    `Found ${overlaps.length} overlapping rank ranges` : 
                    'No overlapping rank ranges found'
            };
        } catch (error) {
            console.error('Error checking rank overlaps:', error);
            throw error;
        }
    }
    
    // Bulk create prize by rank records
    static async bulkCreatePrizeByRank(records) {
        try {
            if (!Array.isArray(records) || records.length === 0) {
                throw new Error('Records must be a non-empty array');
            }
            
            const results = [];
            const errors = [];
            
            for (let i = 0; i < records.length; i++) {
                try {
                    const result = await this.createPrizeByRank(records[i]);
                    results.push(result.data);
                } catch (error) {
                    errors.push({
                        index: i,
                        data: records[i],
                        error: error.message
                    });
                }
            }
            
            return {
                success: errors.length === 0,
                data: results,
                errors: errors,
                created_count: results.length,
                error_count: errors.length,
                message: `Created ${results.length} records, ${errors.length} errors`
            };
        } catch (error) {
            console.error('Error in bulk create:', error);
            throw error;
        }
    }
    
    // Get summary of prize by rank with prize setting data
    static async getSummaryPrizeByRank(serverid) {
        try {
            const summaryData = await PrizeByRank.getSummaryPrizeByRank(serverid);
            
            return {
                success: true,
                data: summaryData,
                message: 'Summary data retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting summary prize by rank:', error);
            throw error;
        }
    }
}

module.exports = PrizeByRankService;
