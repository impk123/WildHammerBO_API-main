const axios = require('axios');
const ActiveServers = require('../models/activeServers');


class GameService {
    constructor() {
        this.gameApiUrl = process.env.GAME_API_URL || 'http://localhost:8080/api';
        this.gameApiKey = process.env.GAME_API_KEY || 'your-game-api-key';
        this.timeout = parseInt(process.env.GAME_API_TIMEOUT) || 5000;
    }

    // Notify game service about user ban
    async notifyUserBan(userId, banData) {
        try {
            console.log(`🎮 Notifying game service about user ban: ${userId}`);
            
            const response = await axios.post(`${this.gameApiUrl}/users/${userId}/ban`, {
                action: 'ban',
                reason: banData.reason,
                banType: banData.banType,
                duration: banData.duration,
                expiresAt: banData.expiresAt,
                bannedBy: banData.adminId,
                bannedAt: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            console.log(`✅ Game service notified successfully for ban: ${userId}`);
            return {
                success: true,
                gameResponse: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to notify game service about ban for user ${userId}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status,
                gameResponse: error.response?.data
            };
        }
    }

    // Notify game service about user unban
    async notifyUserUnban(userId, unbanData) {
        try {
            console.log(`🎮 Notifying game service about user unban: ${userId}`);
            
            const response = await axios.post(`${this.gameApiUrl}/users/${userId}/unban`, {
                action: 'unban',
                reason: unbanData.reason,
                unbannedBy: unbanData.adminId,
                unbannedAt: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            console.log(`✅ Game service notified successfully for unban: ${userId}`);
            return {
                success: true,
                gameResponse: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to notify game service about unban for user ${userId}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status,
                gameResponse: error.response?.data
            };
        }
    }

    // Get user status from game service
    async getUserStatus(userId) {
        try {
            const response = await axios.get(`${this.gameApiUrl}/users/${userId}/status`, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`
                },
                timeout: this.timeout
            });

            return {
                success: true,
                userStatus: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to get user status from game service for user ${userId}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status
            };
        }
    }

    // Check if game service is available
    async checkGameServiceHealth() {
        try {
            const response = await axios.get(`${this.gameApiUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`
                },
                timeout: this.timeout
            });

            return {
                success: true,
                healthy: true,
                response: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Game service health check failed:`, error.message);
            
            return {
                success: false,
                healthy: false,
                error: error.message,
                statusCode: error.response?.status
            };
        }
    }

    // Bulk sync banned users to game service
    async syncBannedUsers(bannedUsers) {
        try {
            console.log(`🎮 Syncing ${bannedUsers.length} banned users to game service`);
            
            const response = await axios.post(`${this.gameApiUrl}/users/sync-bans`, {
                bannedUsers: bannedUsers.map(user => ({
                    userId: user.id,
                    email: user.email,
                    banReason: user.ban_reason,
                    bannedAt: user.banned_at,
                    expiresAt: user.ban_expires_at,
                    banType: user.ban_expires_at ? 'temporary' : 'permanent'
                }))
            }, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout * 2 // Double timeout for bulk operations
            });

            console.log(`✅ Bulk sync completed successfully`);
            return {
                success: true,
                syncedCount: bannedUsers.length,
                gameResponse: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to sync banned users to game service:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status,
                gameResponse: error.response?.data
            };
        }
    }

    // Notify game service about purchase
    async notifyPurchase(purchaseData) {
        try {
            console.log(`🎮 Notifying game service about purchase: ${purchaseData.transaction_id}`);
            
            const response = await axios.post(`${this.gameApiUrl}/purchases/notify`, {
                userId: purchaseData.user_id,
                packageId: purchaseData.package_id,
                transactionId: purchaseData.transaction_id,
                rewards: purchaseData.rewards,
                amount: purchaseData.amount,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            console.log(`✅ Game service notified successfully for purchase: ${purchaseData.transaction_id}`);
            return {
                success: true,
                gameResponse: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to notify game service about purchase ${purchaseData.transaction_id}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status,
                gameResponse: error.response?.data
            };
        }
    }

    // Deliver rewards to user
    async deliverRewards(rewardData) {
        try {
            console.log(`🎮 Delivering rewards to user ${rewardData.user_id}`);
            
            const response = await axios.post(`${this.gameApiUrl}/users/${rewardData.user_id}/rewards`, {
                rewards: rewardData.rewards,
                source: rewardData.source || 'purchase',
                referenceId: rewardData.reference_id,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            console.log(`✅ Rewards delivered successfully to user ${rewardData.user_id}`);
            return {
                success: true,
                gameResponse: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to deliver rewards to user ${rewardData.user_id}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status,
                gameResponse: error.response?.data
            };
        }
    }

    // Remove rewards from user (for refunds)
    async removeRewards(rewardData) {
        try {
            console.log(`🎮 Removing rewards from user ${rewardData.user_id}`);
            
            const response = await axios.post(`${this.gameApiUrl}/users/${rewardData.user_id}/rewards/remove`, {
                rewards: rewardData.rewards,
                source: rewardData.source || 'refund',
                referenceId: rewardData.reference_id,
                timestamp: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            console.log(`✅ Rewards removed successfully from user ${rewardData.user_id}`);
            return {
                success: true,
                gameResponse: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to remove rewards from user ${rewardData.user_id}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status,
                gameResponse: error.response?.data
            };
        }
    }

    // Get user's current balance/inventory
    async getUserBalance(userId) {
        try {
            const response = await axios.get(`${this.gameApiUrl}/users/${userId}/balance`, {
                headers: {
                    'Authorization': `Bearer ${this.gameApiKey}`
                },
                timeout: this.timeout
            });

            return {
                success: true,
                balance: response.data,
                statusCode: response.status
            };

        } catch (error) {
            console.error(`❌ Failed to get user balance for user ${userId}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                statusCode: error.response?.status
            };
        }
    }

    // Get active servers from database
    async getActiveServers() {
        try {
            console.log('🎮 Getting active servers from database');
            
            const result = await ActiveServers.getActiveServers();
            
            if (result.success) {
                console.log(`✅ Found ${result.count} active servers:`, result.serverIds);
                return {
                    success: true,
                    serverIds: result.serverIds,
                    iosVersionCode: result.iosVersionCode,
                    androidVersionCode: result.androidVersionCode,
                    count: result.count,
                    rawData: result.rawData
                };
            } else {
                console.log('⚠️ No active servers found or error occurred');
                return {
                    success: false,
                    error: result.error || result.message,
                    serverIds: [],
                    iosVersionCode: null,
                    androidVersionCode: null,
                    count: 0
                };
            }

        } catch (error) {
            console.error('❌ Failed to get active servers:', error.message);
            
            return {
                success: false,
                error: error.message,
                serverIds: [],
                iosVersionCode: null,
                androidVersionCode: null,
                count: 0
            };
        }
    }
}

// Create singleton instance
const gameService = new GameService();

module.exports = gameService;
