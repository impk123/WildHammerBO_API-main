const GiftCodeModel = require('../models/giftCode');
const GiftCodeRedemptionModel = require('../models/giftCodeRedemption');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db_backoffice = require('../models/db_backoffice');

class GiftCodeService {
    // Generate a new gift code
    static async createGiftCode(adminId, giftCodeData) {
        try {
            // Generate unique code if not provided
            if (!giftCodeData.code) {
                giftCodeData.code = await GiftCodeModel.generateUniqueCode(
                    process.env.GIFT_CODE_PREFIX || 'GC',
                    parseInt(process.env.GIFT_CODE_LENGTH) || 8
                );
            }

            // Set creator
            giftCodeData.createdBy = adminId;

            // Create the gift code
            const giftCode = await GiftCodeModel.create(giftCodeData);

            return {
                success: true,
                data: giftCode,
                message: 'Gift code created successfully'
            };

        } catch (error) {
            console.error('Create gift code error:', error);
            return {
                success: false,
                message: error.message || 'Failed to create gift code'
            };
        }
    }

    // Validate a gift code
    static async validateGiftCode(code, userId = null) {
        try {
            // Get from database
            const giftCode = await GiftCodeModel.findByCode(code);
            
            if (!giftCode) {
                return {
                    valid: false,
                    reason: 'Gift code not found'
                };
            }

            // Validate gift code
            const validation = await GiftCodeModel.isValidForRedemption(giftCode, userId);
            
            return {
                valid: validation.valid,
                reason: validation.reason,
                giftCode: validation.valid ? giftCode : null
            };

        } catch (error) {
            console.error('Validate gift code error:', error);
            return {
                valid: false,
                reason: 'Validation error occurred'
            };
        }
    }

    // Redeem a gift code
    static async redeemGiftCode(code, userId, userEmail, ipAddress = null, userAgent = null) {
        try {
            // Validate gift code
            const validation = await this.validateGiftCode(code, userId);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.reason
                };
            }

            const giftCode = validation.giftCode;

            // Process rewards
            const rewardResult = await this.processRewards(userId, giftCode.rewards);
            
            if (!rewardResult.success) {
                // Log failed redemption
                await GiftCodeRedemptionModel.create({
                    giftCodeId: giftCode.id,
                    userId: userId,
                    userEmail: userEmail,
                    redemptionStatus: 'failed',
                    rewardsGiven: null,
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                    errorMessage: rewardResult.message
                });

                return {
                    success: false,
                    message: rewardResult.message
                };
            }

            // Update gift code usage count
            await GiftCodeModel.incrementUsageCount(giftCode.id);

            // Log successful redemption
            await GiftCodeRedemptionModel.create({
                giftCodeId: giftCode.id,
                userId: userId,
                userEmail: userEmail,
                redemptionStatus: 'success',
                rewardsGiven: giftCode.rewards,
                ipAddress: ipAddress,
                userAgent: userAgent,
                errorMessage: null
            });

            return {
                success: true,
                message: 'Gift code redeemed successfully',
                rewards: giftCode.rewards
            };

        } catch (error) {
            console.error('Redeem gift code error:', error);

            // Log failed redemption
            try {
                await GiftCodeRedemptionModel.create({
                    giftCodeId: null,
                    userId: userId,
                    userEmail: userEmail,
                    redemptionStatus: 'failed',
                    rewardsGiven: null,
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                    errorMessage: error.message
                });
            } catch (logError) {
                console.error('Failed to log redemption error:', logError);
            }

            return {
                success: false,
                message: 'Redemption failed due to system error'
            };
        }
    }

    // Process rewards for user
    static async processRewards(userId, rewards) {
        try {
            
            
            // Get connection from pool for transaction
            const connection = await db_backoffice.getPool().getConnection();

            try {
                // Start transaction
                await connection.beginTransaction();
                // Update user coins
                if (rewards.coins && rewards.coins > 0) {
                    await connection.execute(
                        'UPDATE users SET coins = COALESCE(coins, 0) + ? WHERE id = ?',
                        [rewards.coins, userId]
                    );
                }

                // Update user premium currency (gems)
                if (rewards.gems && rewards.gems > 0) {
                    await connection.execute(
                        'UPDATE users SET premium_currency = COALESCE(premium_currency, 0) + ? WHERE id = ?',
                        [rewards.gems, userId]
                    );
                }

                // Update user experience
                if (rewards.experience && rewards.experience > 0) {
                    await connection.execute(
                        'UPDATE users SET level = level + ? WHERE id = ?',
                        [Math.floor(rewards.experience / 1000), userId] // Simple level calculation
                    );
                }

                // Add items to inventory
                if (rewards.items && typeof rewards.items === 'object') {
                    for (const [itemId, quantity] of Object.entries(rewards.items)) {
                        await connection.execute(`
                            INSERT INTO user_inventory (user_id, item_type, item_id, quantity)
                            VALUES (?, 'gift', ?, ?)
                            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                        `, [userId, itemId, quantity]);
                    }
                }

                // Commit transaction
                await connection.commit();

                return {
                    success: true,
                    message: 'Rewards processed successfully'
                };

            } catch (error) {
                // Rollback transaction
                await connection.rollback();
                throw error;
            } finally {
                // Always release the connection back to the pool
                connection.release();
            }

        } catch (error) {
            console.error('Process rewards error:', error);
            return {
                success: false,
                message: 'Failed to process rewards'
            };
        }
    }

    // Get gift codes with pagination
    static async getGiftCodes(page = 1, limit = 20, filters = {}) {
        try {
            const giftCodes = await GiftCodeModel.findAll(page, limit, filters);
            const total = await GiftCodeModel.getCount(filters);

            return {
                success: true,
                data: {
                    giftCodes,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: limit
                    }
                }
            };

        } catch (error) {
            console.error('Get gift codes error:', error);
            return {
                success: false,
                message: 'Failed to retrieve gift codes'
            };
        }
    }

    // Get gift code statistics
    static async getStatistics() {
        try {
            const stats = await GiftCodeModel.getStatistics();
            // const redemptionStats = await GiftCodeRedemptionModel.getStatistics();

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('Get statistics error:', error);
            return {
                success: false,
                message: 'Failed to retrieve statistics'
            };
        }
    }

    // Deactivate gift code
    static async deactivateGiftCode(id) {
        try {
            await GiftCodeModel.deactivate(id);

            return {
                success: true,
                message: 'Gift code deactivated successfully'
            };

        } catch (error) {
            console.error('Deactivate gift code error:', error);
            return {
                success: false,
                message: 'Failed to deactivate gift code'
            };
        }
    }

    // Activate gift code
    static async activateGiftCode(id) {
        try {
            await GiftCodeModel.activate(id);

            return {
                success: true,
                message: 'Gift code activated successfully'
            };

        } catch (error) {
            console.error('Activate gift code error:', error);
            return {
                success: false,
                message: 'Failed to activate gift code'
            };
        }
    }
}

module.exports = GiftCodeService;
