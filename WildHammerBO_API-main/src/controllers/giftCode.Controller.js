const GiftCodeService = require('../services/giftCodeService');

class GiftCodeController {
    // Create a new gift code (Admin only)
    static async createGiftCode(req, res) {
        try {
            const { code, type, rewards, usageLimit, expiresAt } = req.body;
            const adminId = req.admin.id;

            // Validate required fields
            if (!type || !rewards) {
                return res.status(400).json({
                    success: false,
                    message: 'Type and rewards are required'
                });
            }

            // Validate type
            const validTypes = ['single', 'multi', 'unlimited'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid gift code type. Must be one of: single, multi, unlimited'
                });
            }

            const giftCodeData = {
                code,
                type,
                rewards,
                usageLimit: usageLimit || null,
                expiresAt: expiresAt || null,
                isActive: true
            };

            const result = await GiftCodeService.createGiftCode(adminId, giftCodeData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);

        } catch (error) {
            console.error('Create gift code error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Validate a gift code
    static async validateGiftCode(req, res) {
        try {
            const { code } = req.params;
            const userId = req.admin?.id || null;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Gift code is required'
                });
            }

            const result = await GiftCodeService.validateGiftCode(code, userId);

            res.json({
                success: result.valid,
                message: result.valid ? 'Gift code is valid' : result.reason,
                data: result.giftCode ? {
                    code: result.giftCode.code,
                    type: result.giftCode.type,
                    rewards: result.giftCode.rewards,
                    expiresAt: result.giftCode.end_date
                } : null
            });

        } catch (error) {
            console.error('Validate gift code error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Redeem a gift code (User endpoint)
    static async redeemGiftCode(req, res) {
        try {
            const { code } = req.body;
            const userId = req.admin.id;
            const userEmail = req.admin.email;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Gift code is required'
                });
            }

            const result = await GiftCodeService.redeemGiftCode(
                code,
                userId,
                userEmail,
                ipAddress,
                userAgent
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Redeem gift code error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get all gift codes (Admin only)
    static async getGiftCodes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const type = req.query.type;
            const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
            const search = req.query.search;

            const filters = {};
            if (type) filters.type = type;
            if (isActive !== undefined) filters.isActive = isActive;
            if (search) filters.search = search;

            const result = await GiftCodeService.getGiftCodes(page, limit, filters);

            if (!result.success) {
                return res.status(500).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Get gift codes error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get gift code statistics (Admin only)
    static async getStatistics(req, res) {
        try {
            const result = await GiftCodeService.getStatistics();

            if (!result.success) {
                return res.status(500).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Deactivate gift code (Admin only)
    static async deactivateGiftCode(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid gift code ID is required'
                });
            }

            const result = await GiftCodeService.deactivateGiftCode(parseInt(id));

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Deactivate gift code error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Activate gift code (Admin only)
    static async activateGiftCode(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid gift code ID is required'
                });
            }

            const result = await GiftCodeService.activateGiftCode(parseInt(id));

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Activate gift code error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get gift code by ID (Admin only)
    static async getGiftCodeById(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid gift code ID is required'
                });
            }

            const GiftCodeModel = require('../models/giftCode');
            const giftCode = await GiftCodeModel.findById(parseInt(id));

            if (!giftCode) {
                return res.status(404).json({
                    success: false,
                    message: 'Gift code not found'
                });
            }

            res.json({
                success: true,
                data: giftCode
            });

        } catch (error) {
            console.error('Get gift code by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Generate gift code preview (Admin only)
    static async generateCodePreview(req, res) {
        try {
            const GiftCodeModel = require('../models/giftCode');
            const prefix = req.query.prefix || process.env.GIFT_CODE_PREFIX || 'GC';
            const length = parseInt(req.query.length) || parseInt(process.env.GIFT_CODE_LENGTH) || 8;

            const code = await GiftCodeModel.generateUniqueCode(prefix, length);

            res.json({
                success: true,
                data: { code }
            });

        } catch (error) {
            console.error('Generate code preview error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = GiftCodeController;
