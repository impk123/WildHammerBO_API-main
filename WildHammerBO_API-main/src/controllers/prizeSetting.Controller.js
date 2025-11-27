const PrizeSettingService = require('../services/prizeSettingService');

class PrizeSettingController {
    // Update all prize setting values where id=1
    static async updateAllSettings(req, res) {
        try {
            const {
                serverid,
                initial_prize,
                tota_buytoken,
                percent_addon,
                addon_prize
            } = req.body;
            
            // Validate required fields
            if (serverid === undefined || initial_prize === undefined || tota_buytoken === undefined || 
                percent_addon === undefined || addon_prize === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: serverid, initial_prize, tota_buytoken, percent_addon, addon_prize'
                });
            }
            
            const updateData = {
                initial_prize: parseFloat(initial_prize),
                tota_buytoken: parseFloat(tota_buytoken),
                percent_addon: parseFloat(percent_addon),
                addon_prize: parseFloat(addon_prize)
            };
            
            const result = await PrizeSettingService.updateAllSettings(parseInt(serverid), updateData);
            
            res.json(result);
        } catch (error) {
            console.error('Error updating prize settings:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update prize settings'
            });
        }
    }
    
    // Increase total_buytoken
    static async increaseTotalBuytoken(req, res) {
        try {
            const { serverid, increase_amount } = req.body;
            
            // Validate required fields
            if (serverid === undefined || increase_amount === undefined || increase_amount === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: serverid, increase_amount'
                });
            }
            
            const increaseAmount = parseFloat(increase_amount);
            
            if (isNaN(increaseAmount)) {
                return res.status(400).json({
                    success: false,
                    message: 'increase_amount must be a valid number'
                });
            }
            
            const result = await PrizeSettingService.increaseTotalBuytoken(parseInt(serverid), increaseAmount);
            
            res.json(result);
        } catch (error) {
            console.error('Error increasing total buytoken:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to increase total buytoken'
            });
        }
    }
    
    // Get prize setting (bonus endpoint for testing/viewing)
    static async getPrizeSetting(req, res) {
        try {
            const { id } = req.params;
            const settingId = id ? parseInt(id) : 1;
            
            const result = await PrizeSettingService.getPrizeSetting(settingId);
            
            res.json(result);
        } catch (error) {
            console.error('Error getting prize setting:', error);
            res.status(404).json({
                success: false,
                message: error.message || 'Failed to get prize setting'
            });
        }
    }
    
    // Get all prize settings (bonus endpoint for testing/viewing)
    static async getAllPrizeSettings(req, res) {
        try {
            const result = await PrizeSettingService.getAllPrizeSettings();
            
            res.json(result);
        } catch (error) {
            console.error('Error getting all prize settings:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get prize settings'
            });
        }
    }
}

module.exports = PrizeSettingController;
