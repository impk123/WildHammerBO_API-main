const PrizeByRankService = require('../services/prizeByRankService');

class PrizeByRankController {
    // Get all prize by rank records
    static async getAllPrizeByRank(req, res) {
        try {
            const {
                from_rank,
                to_rank,
                min_percent,
                max_percent,
                limit,
                offset,
                serverid,
            } = req.query;
            
            const options = {
                from_rank: from_rank ? parseInt(from_rank) : undefined,
                to_rank: to_rank ? parseInt(to_rank) : undefined,
                min_percent: min_percent ? parseFloat(min_percent) : undefined,
                max_percent: max_percent ? parseFloat(max_percent) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
                serverid: serverid ? parseInt(serverid) : undefined
            };
            
            const result = await PrizeByRankService.getAllPrizeByRank(options);
            
            res.json(result);
        } catch (error) {
            console.error('Error getting all prize by rank records:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get prize by rank records'
            });
        }
    }
    
    // Get prize by rank by ID
    static async getPrizeByRankById(req, res) {
        try {
            const { id } = req.params;
            const recordId = parseInt(id);
            
            if (isNaN(recordId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ID format'
                });
            }
            
            const result = await PrizeByRankService.getPrizeByRankById(recordId);
            
            res.json(result);
        } catch (error) {
            console.error('Error getting prize by rank by ID:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Failed to get prize by rank record'
            });
        }
    }
    
    // Create new prize by rank record
    static async createPrizeByRank(req, res) {
        try {
            const {
                from_rank,
                to_rank,
                percent_prize
            } = req.body;
            
            // Validate required fields
            if (from_rank === undefined || to_rank === undefined || percent_prize === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: from_rank, to_rank, percent_prize'
                });
            }
            
            const prizeData = {
                from_rank: parseInt(from_rank),
                to_rank: parseInt(to_rank),
                percent_prize: parseFloat(percent_prize)
            };
            
            const result = await PrizeByRankService.createPrizeByRank(prizeData);
            
            res.status(201).json(result);
        } catch (error) {
            console.error('Error creating prize by rank:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create prize by rank record'
            });
        }
    }
    
    // Update prize by rank record
    static async updatePrizeByRank(req, res) {
        try {
            const { id } = req.params;
            const recordId = parseInt(id);
            
            if (isNaN(recordId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ID format'
                });
            }
            
            const updateData = {};
            
            // Only include fields that are provided
            if (req.body.from_rank !== undefined) {
                updateData.from_rank = parseInt(req.body.from_rank);
            }
            if (req.body.to_rank !== undefined) {
                updateData.to_rank = parseInt(req.body.to_rank);
            }
            if (req.body.percent_prize !== undefined) {
                updateData.percent_prize = parseFloat(req.body.percent_prize);
            }
            if (req.body.serverid !== undefined) {
                updateData.serverid = parseInt(req.body.serverid);
            }
            
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields to update'
                });
            }
            
            const result = await PrizeByRankService.updatePrizeByRank(recordId, updateData);
            
            res.json(result);
        } catch (error) {
            console.error('Error updating prize by rank:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update prize by rank record'
            });
        }
    }
    
    // Delete prize by rank record
    static async deletePrizeByRank(req, res) {
        try {
            const { id } = req.params;
            const recordId = parseInt(id);
            
            if (isNaN(recordId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid ID format'
                });
            }
            
            const result = await PrizeByRankService.deletePrizeByRank(recordId);
            
            res.json(result);
        } catch (error) {
            console.error('Error deleting prize by rank:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete prize by rank record'
            });
        }
    }
    
    // Get prize percentage for a specific rank
    static async getPrizeForRank(req, res) {
        try {
            const { rank } = req.params;
            const rankNumber = parseInt(rank);
            
            if (isNaN(rankNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid rank format'
                });
            }
            
            const result = await PrizeByRankService.getPrizeForRank(rankNumber);
            
            res.json(result);
        } catch (error) {
            console.error('Error getting prize for rank:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get prize for rank'
            });
        }
    }
    
    // Get statistics
    static async getStatistics(req, res) {
        try {
            const result = await PrizeByRankService.getStatistics();
            
            res.json(result);
        } catch (error) {
            console.error('Error getting statistics:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get statistics'
            });
        }
    }
    
    // Check for rank range overlaps
    static async checkOverlaps(req, res) {
        try {
            const result = await PrizeByRankService.checkOverlaps();
            
            res.json(result);
        } catch (error) {
            console.error('Error checking overlaps:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to check overlaps'
            });
        }
    }
    
    // Bulk create prize by rank records
    static async bulkCreatePrizeByRank(req, res) {
        try {
            const { records } = req.body;
            
            if (!Array.isArray(records) || records.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Records must be a non-empty array'
                });
            }
            
            const result = await PrizeByRankService.bulkCreatePrizeByRank(records);
            
            res.status(201).json(result);
        } catch (error) {
            console.error('Error in bulk create:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to bulk create records'
            });
        }
    }
    
    // Get summary of prize by rank with prize setting data
    static async getSummaryPrizeByRank(req, res) {
        try {
            const { serverid } = req.query;
            if (serverid === undefined || serverid === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: serverid'
                });
            }
            const serverId = parseInt(serverid);
            
            const result = await PrizeByRankService.getSummaryPrizeByRank(serverId);
            
            res.json(result);
        } catch (error) {
            console.error('Error getting summary prize by rank:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get summary data'
            });
        }
    }
}

module.exports = PrizeByRankController;
