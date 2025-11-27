const Reward = require('../models/reward');
const RewardRedemption = require('../models/rewardRedemption');
const db_wgbackend = require('../models/db_wgbackend');
const jwtGameUtils = require('../utils/jwtGameUtils');
const backendUserService = require('../services/backendUserSevice');

class RewardController {
    // Get all active rewards for display
    static async getActiveRewards(req, res) {
        try {
            const rewards = await Reward.getAllActive();
            res.json({
                success: true,
                data: rewards
            });
        } catch (error) {
            console.error('Error getting active rewards:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get active rewards',
                error: error.message
            });
        }
    }

    // Get all rewards (admin)
    static async getAllRewards(req, res) {
        try {
            const rewards = await Reward.getAll();
            res.json({
                success: true,
                data: rewards
            });
        } catch (error) {
            console.error('Error getting all rewards:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get all rewards',
                error: error.message
            });
        }
    }

    // Get reward by ID
    static async getRewardById(req, res) {
        try {
            const { id } = req.params;
            const reward = await Reward.getById(id);
            
            if (!reward) {
                return res.status(404).json({
                    success: false,
                    message: 'Reward not found'
                });
            }

            res.json({
                success: true,
                data: reward
            });
        } catch (error) {
            console.error('Error getting reward by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get reward',
                error: error.message
            });
        }
    }

    // Create new reward (admin)
    static async createReward(req, res) {
        try {
            const { name, image_url, token_cost, description, stock_quantity } = req.body;

            // Validate required fields
            if (!name || !image_url || !token_cost) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, image_url, and token_cost are required'
                });
            }

            if (token_cost <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Token cost must be greater than 0'
                });
            }

            const rewardId = await Reward.create({
                name,
                image_url,
                token_cost,
                description: description || '',
                stock_quantity: stock_quantity || -1
            });

            const newReward = await Reward.getById(rewardId);

            res.status(201).json({
                success: true,
                message: 'Reward created successfully',
                data: newReward
            });
        } catch (error) {
            console.error('Error creating reward:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create reward',
                error: error.message
            });
        }
    }

    // Update reward (admin)
    static async updateReward(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const reward = await Reward.getById(id);
            if (!reward) {
                return res.status(404).json({
                    success: false,
                    message: 'Reward not found'
                });
            }

            await reward.update(updateData);
            const updatedReward = await Reward.getById(id);

            res.json({
                success: true,
                message: 'Reward updated successfully',
                data: updatedReward
            });
        } catch (error) {
            console.error('Error updating reward:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update reward',
                error: error.message
            });
        }
    }

    // Delete reward (admin)
    static async deleteReward(req, res) {
        try {
            const { id } = req.params;

            const reward = await Reward.getById(id);
            if (!reward) {
                return res.status(404).json({
                    success: false,
                    message: 'Reward not found'
                });
            }

            await reward.delete();

            res.json({
                success: true,
                message: 'Reward deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting reward:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete reward',
                error: error.message
            });
        }
    }

    // Redeem reward
    static async redeemReward(req, res) {
        try {
            const { reward_id, shipping_address, email, token } = req.body;

            // Validate required fields
            if (!reward_id || !shipping_address || !email || !token) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required (reward_id, shipping_address, email, token)'
                });
            }

            // Decode token to get user info
            const decoded = jwtGameUtils.decodeGameToken(token);
            const roleId = decoded.id;
            const userid = decoded.userid || '';
            const serverid = decoded.serverid || 0;

            if (userid === '' || serverid === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid token - missing userid or serverid'
                });
            }

            // Check token expiration
            if (decoded.exp < Date.now() / 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Token expired'
                });
            }

            // Get reward details
            const reward = await Reward.getById(reward_id);
            if (!reward) {
                return res.status(404).json({
                    success: false,
                    message: 'Reward not found'
                });
            }

            // Check if reward is available
            if (!await reward.isAvailable()) {
                return res.status(400).json({
                    success: false,
                    message: 'Reward is not available'
                });
            }

            // Get user's realMoney balance using backendUserService
            const userBackendData = await backendUserService.getUsersById(serverid, userid);
            if (!userBackendData || userBackendData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const userData = userBackendData[0];
            const currentRealMoney = userData.realMoney;
            
            if (currentRealMoney < reward.token_cost) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient realMoney balance',
                    current_balance: currentRealMoney,
                    required_tokens: reward.token_cost
                });
            }

            // Get connection from pool for transaction
            const connection = await db_wgbackend.getPool().getConnection();

            try {
                // Start transaction
                await connection.beginTransaction();

                // Deduct realMoney using backendUserService
                const resultReduceMoney = await backendUserService.reduceRealmoney(serverid, userid, reward.token_cost);
                if (resultReduceMoney.affectedRows === 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to reduce realMoney'
                    });
                }

                // Decrease reward stock
                await reward.decreaseStock();

                // Create redemption record
                const redemptionId = await RewardRedemption.create({
                    reward_id: reward.id,
                    user_id: userid,
                    server_id: serverid,
                    token_cost: reward.token_cost,
                    real_money_before: currentRealMoney,
                    real_money_after: currentRealMoney - reward.token_cost,
                    shipping_address,
                    email,
                    notes: null
                });

                await connection.commit();

                res.json({
                    success: true,
                    message: 'Reward redeemed successfully',
                    data: {
                        redemption_id: redemptionId,
                        new_balance: currentRealMoney - reward.token_cost,
                        reward_name: reward.name,
                        user_id: userid,
                        server_id: serverid
                    }
                });

            } catch (transactionError) {
                await connection.rollback();
                throw transactionError;
            } finally {
                // Always release the connection back to the pool
                connection.release();
            }

        } catch (error) {
            console.error('Error redeeming reward:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to redeem reward',
                error: error.message
            });
        }
    }

    // Get user's redemption history
    static async getUserRedemptions(req, res) {
        try {
            const token = req.query.token || '';

            if (token === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
            }

            // Decode token to get user info
            const decoded = jwtGameUtils.decodeGameToken(token);
            const roleId = decoded.id;
            const userid = decoded.userid || '';
            const serverid = decoded.serverid || 0;

            if (userid === '' || serverid === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid token - missing userid or serverid'
                });
            }

            // Check token expiration
            if (decoded.exp < Date.now() / 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Token expired'
                });
            }

            const redemptions = await RewardRedemption.getByUser(userid, serverid);

            res.json({
                success: true,
                data: redemptions
            });
        } catch (error) {
            console.error('Error getting user redemptions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user redemptions',
                error: error.message
            });
        }
    }

    // Get all redemptions (admin)
    static async getAllRedemptions(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const redemptions = await RewardRedemption.getAll(parseInt(limit), parseInt(offset));

            res.json({
                success: true,
                data: redemptions
            });
        } catch (error) {
            console.error('Error getting all redemptions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get all redemptions',
                error: error.message
            });
        }
    }

    // Update redemption status (admin)
    static async updateRedemptionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const redemption = await RewardRedemption.getById(id);
            if (!redemption) {
                return res.status(404).json({
                    success: false,
                    message: 'Redemption not found'
                });
            }

            await redemption.updateStatus(status, notes);

            res.json({
                success: true,
                message: 'Redemption status updated successfully',
                data: redemption
            });
        } catch (error) {
            console.error('Error updating redemption status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update redemption status',
                error: error.message
            });
        }
    }

    // Get redemption statistics (admin)
    static async getRedemptionStatistics(req, res) {
        try {
            const statistics = await RewardRedemption.getStatistics();

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Error getting redemption statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get redemption statistics',
                error: error.message
            });
        }
    }
}

module.exports = RewardController;
