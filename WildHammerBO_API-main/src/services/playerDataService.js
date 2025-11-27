const { redisManager } = require('../config/redis');

class PlayerDataService {
    // Get player data from Redis
    static async getPlayerData(serverid, roleid) {
        try {
            const key = `PRO_NAME_${serverid}_${roleid}_rinfo`;
            const playerData = await redisManager.get(key);
            
            if (!playerData) {
                throw new Error(`Player data not found for server ${serverid}, role ${roleid}`);
            }
            
            return JSON.parse(playerData);
        } catch (error) {
            console.error('Error getting player data:', error);
            throw error;
        }
    }
    
    // Update player data in Redis
    static async updatePlayerData(serverid, roleid, updatedData) {
        try {
            const key = `PRO_NAME_${serverid}_${roleid}_rinfo`;
            const jsonData = JSON.stringify(updatedData);
            
            await redisManager.set(key, jsonData);
            
            //console.log(`Player data updated for server ${serverid}, role ${roleid}`);
            
            return {
                success: true,
                message: 'Player data updated successfully',
                key: key
            };
        } catch (error) {
            console.error('Error updating player data:', error);
            throw error;
        }
    }
    
    // Add price token to player's recharge info
    static async addPriceToken(serverid, roleid, priceTokenAmount) {
        try {
            // Validate input
            if (!serverid || !roleid || priceTokenAmount === undefined || priceTokenAmount === null) {
                throw new Error('Missing required fields: serverid, roleid, priceTokenAmount');
            }
            
            if (typeof priceTokenAmount !== 'number' || priceTokenAmount < 0) {
                throw new Error('priceTokenAmount must be a non-negative number');
            }
            
            // Get current player data
            const playerData = await this.getPlayerData(serverid, roleid);
            
            // Initialize rechargeInfo if it doesn't exist
            if (!playerData.info.rechargeInfo) {
                playerData.info.rechargeInfo = {
                    total6Days: 0,
                    dailyAmounts: 0,
                    today6IsPaid: false,
                    totalAmounts: 0
                };
            }
            
            // Add price token to totalAmounts
            const currentTotalAmounts = playerData.info.rechargeInfo.totalAmounts || 0;
            const currentDailyAmounts = playerData.info.rechargeInfo.dailyAmounts || 0;
            playerData.info.rechargeInfo.totalAmounts = currentTotalAmounts + priceTokenAmount;
            playerData.info.rechargeInfo.dailyAmounts = currentDailyAmounts + priceTokenAmount;
            
            // Update lastlogintime to current time
            playerData.info.lastlogintime = new Date().toISOString();
            playerData.updatedAt = new Date().toISOString();
            
            // Save updated data back to Redis
            const result = await this.updatePlayerData(serverid, roleid, playerData);
            
            return {
                success: true,
                data: {
                    serverid: serverid,
                    roleid: roleid,
                    previous_total_amounts: currentTotalAmounts,
                    added_amount: priceTokenAmount,
                    new_total_amounts: playerData.info.rechargeInfo.totalAmounts
                },
                message: `Added ${priceTokenAmount} price tokens to player ${roleid} on server ${serverid}`
            };
        } catch (error) {
            console.error('Error adding price token:', error);
            throw error;
        }
    }
    
    // Get player recharge info
    static async getPlayerRechargeInfo(serverid, roleid) {
        try {
            const playerData = await this.getPlayerData(serverid, roleid);
            
            const rechargeInfo = playerData.info.rechargeInfo || {
                total6Days: 0,
                dailyAmounts: 0,
                today6IsPaid: false,
                totalAmounts: 0
            };
            
            return {
                success: true,
                data: {
                    serverid: serverid,
                    roleid: roleid,
                    rechargeInfo: rechargeInfo,
                    lastlogintime: playerData.info.lastlogintime
                }
            };
        } catch (error) {
            console.error('Error getting player recharge info:', error);
            throw error;
        }
    }
    
    // Update player recharge info (full update)
    static async updatePlayerRechargeInfo(serverid, roleid, rechargeInfoData) {
        try {
            // Validate input
            if (!serverid || !roleid) {
                throw new Error('Missing required fields: serverid, roleid');
            }
            
            // Get current player data
            const playerData = await this.getPlayerData(serverid, roleid);
            
            // Update recharge info
            playerData.info.rechargeInfo = {
                total6Days: rechargeInfoData.total6Days || 0,
                dailyAmounts: rechargeInfoData.dailyAmounts || 0,
                today6IsPaid: rechargeInfoData.today6IsPaid || false,
                totalAmounts: rechargeInfoData.totalAmounts || 0
            };
            
            // Update timestamps
            playerData.info.lastlogintime = new Date().toISOString();
            playerData.updatedAt = new Date().toISOString();
            
            // Save updated data back to Redis
            const result = await this.updatePlayerData(serverid, roleid, playerData);
            
            return {
                success: true,
                data: {
                    serverid: serverid,
                    roleid: roleid,
                    rechargeInfo: playerData.info.rechargeInfo
                },
                message: `Updated recharge info for player ${roleid} on server ${serverid}`
            };
        } catch (error) {
            console.error('Error updating player recharge info:', error);
            throw error;
        }
    }
    
    // Check if player exists
    static async checkPlayerExists(serverid, roleid) {
        try {
            const key = `PRO_NAME_${serverid}_${roleid}_rinfo`;
            const exists = await redisManager.exists(key);
            
            return {
                success: true,
                data: {
                    serverid: serverid,
                    roleid: roleid,
                    exists: exists === 1
                }
            };
        } catch (error) {
            console.error('Error checking player existence:', error);
            throw error;
        }
    }
}

module.exports = PlayerDataService;
