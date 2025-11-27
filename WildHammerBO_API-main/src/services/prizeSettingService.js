const PrizeSetting = require('../models/prizeSetting');

class PrizeSettingService {
    // Update all prize setting values
    static async updateAllSettings(serverid, updateData) {
        try {
            // Validate required fields
            const requiredFields = ['initial_prize', 'tota_buytoken', 'percent_addon', 'addon_prize'];
            for (const field of requiredFields) {
                if (updateData[field] === undefined || updateData[field] === null) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Validate data types and values
            if (typeof updateData.initial_prize !== 'number' || updateData.initial_prize < 0) {
                throw new Error('initial_prize must be a non-negative number');
            }
            
            if (typeof updateData.tota_buytoken !== 'number' || updateData.tota_buytoken < 0) {
                throw new Error('tota_buytoken must be a non-negative number');
            }
            
            if (typeof updateData.percent_addon !== 'number' || updateData.percent_addon < 0) {
                throw new Error('percent_addon must be a non-negative number');
            }
            
            if (typeof updateData.addon_prize !== 'number' || updateData.addon_prize < 0) {
                throw new Error('addon_prize must be a non-negative number');
            }
            
            const updatedSetting = await PrizeSetting.updateAll(serverid, updateData);
            
            
            return {
                success: true,
                data: updatedSetting,
                message: 'Prize setting updated successfully'
            };
        } catch (error) {
            console.error('Error updating prize settings:', error);
            throw error;
        }
    }
    
    // Increase total buytoken
    static async increaseTotalBuytoken(serverid, increaseAmount) {
        try {
            // Validate increase amount
            if (typeof increaseAmount !== 'number') {
                throw new Error('increaseAmount must be a number');
            }
            
            if (increaseAmount <= 0) {
                throw new Error('increaseAmount must be a positive number');
            }
            
            const updatedSetting = await PrizeSetting.increaseTotalBuytoken(serverid, increaseAmount);
            
            
            return {
                success: true,
                data: updatedSetting,
                message: `Total buytoken increased by ${increaseAmount}`
            };
        } catch (error) {
            console.error('Error increasing total buytoken:', error);
            throw error;
        }
    }
    
    // Get prize setting by ID and serverid
    static async getPrizeSetting(serverid) {
        try {
            const setting = await PrizeSetting.getByServerId( serverid);
            
            if (!setting) {
                throw new Error('Prize setting not found');
            }
            
            return {
                success: true,
                data: setting
            };
        } catch (error) {
            console.error('Error getting prize setting:', error);
            throw error;
        }
    }
    
    // Get all prize settings
    static async getAllPrizeSettings(serverid) {
        try {
            const settings = await PrizeSetting.getAll(serverid);
            
            return {
                success: true,
                data: settings,
                count: settings.length
            };
        } catch (error) {
            console.error('Error getting all prize settings:', error);
            throw error;
        }
    }
}

module.exports = PrizeSettingService;
