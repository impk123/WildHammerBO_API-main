const PlayerDataService = require('../services/playerDataService');

class PlayerDataController {
    // Add price token to player's recharge info
    static async addPriceToken(req, res) {
        try {
            const { serverid, roleid, price_token_amount } = req.body;
            
            // Validate required fields
            if (serverid === undefined || roleid === undefined || price_token_amount === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: serverid, roleid, price_token_amount'
                });
            }
            
            const serverId = parseInt(serverid);
            const roleId = roleid.toString();
            const priceTokenAmount = parseFloat(price_token_amount);
            
            if (isNaN(serverId) || isNaN(priceTokenAmount)) {
                return res.status(400).json({
                    success: false,
                    message: 'serverid and price_token_amount must be valid numbers'
                });
            }
            
            const result = await PlayerDataService.addPriceToken(serverId, roleId, priceTokenAmount);
            
            res.json(result);
        } catch (error) {
            console.error('Error adding price token:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to add price token'
            });
        }
    }
    
    // Get player recharge info
    static async getPlayerRechargeInfo(req, res) {
        try {
            const { serverid, roleid } = req.params;
            
            if (!serverid || !roleid) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: serverid, roleid'
                });
            }
            
            const serverId = parseInt(serverid);
            const roleId = roleid.toString();
            
            if (isNaN(serverId)) {
                return res.status(400).json({
                    success: false,
                    message: 'serverid must be a valid number'
                });
            }
            
            const result = await PlayerDataService.getPlayerRechargeInfo(serverId, roleId);
            
            res.json(result);
        } catch (error) {
            console.error('Error getting player recharge info:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Failed to get player recharge info'
            });
        }
    }
    
    // Update player recharge info (full update)
    static async updatePlayerRechargeInfo(req, res) {
        try {
            const { serverid, roleid } = req.params;
            const { total6Days, dailyAmounts, today6IsPaid, totalAmounts } = req.body;
            
            if (!serverid || !roleid) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: serverid, roleid'
                });
            }
            
            const serverId = parseInt(serverid);
            const roleId = roleid.toString();
            
            if (isNaN(serverId)) {
                return res.status(400).json({
                    success: false,
                    message: 'serverid must be a valid number'
                });
            }
            
            const rechargeInfoData = {
                total6Days: total6Days !== undefined ? parseInt(total6Days) : undefined,
                dailyAmounts: dailyAmounts !== undefined ? parseFloat(dailyAmounts) : undefined,
                today6IsPaid: today6IsPaid !== undefined ? Boolean(today6IsPaid) : undefined,
                totalAmounts: totalAmounts !== undefined ? parseFloat(totalAmounts) : undefined
            };
            
            const result = await PlayerDataService.updatePlayerRechargeInfo(serverId, roleId, rechargeInfoData);
            
            res.json(result);
        } catch (error) {
            console.error('Error updating player recharge info:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update player recharge info'
            });
        }
    }
    
    // Check if player exists
    static async checkPlayerExists(req, res) {
        try {
            const { serverid, roleid } = req.params;
            
            if (!serverid || !roleid) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: serverid, roleid'
                });
            }
            
            const serverId = parseInt(serverid);
            const roleId = roleid.toString();
            
            if (isNaN(serverId)) {
                return res.status(400).json({
                    success: false,
                    message: 'serverid must be a valid number'
                });
            }
            
            const result = await PlayerDataService.checkPlayerExists(serverId, roleId);
            
            res.json(result);
        } catch (error) {
            console.error('Error checking player existence:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to check player existence'
            });
        }
    }
    
    // Get player data (full data)
    static async getPlayerData(req, res) {
        try {
            const { serverid, roleid } = req.params;
            
            if (!serverid || !roleid) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: serverid, roleid'
                });
            }
            
            const serverId = parseInt(serverid);
            const roleId = roleid.toString();
            
            if (isNaN(serverId)) {
                return res.status(400).json({
                    success: false,
                    message: 'serverid must be a valid number'
                });
            }
            
            const playerData = await PlayerDataService.getPlayerData(serverId, roleId);
            
            res.json({
                success: true,
                data: playerData
            });
        } catch (error) {
            console.error('Error getting player data:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Failed to get player data'
            });
        }
    }
}

module.exports = PlayerDataController;
