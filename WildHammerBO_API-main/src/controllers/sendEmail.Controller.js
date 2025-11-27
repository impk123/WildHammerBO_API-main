const sendEmailService = require('../services/sendEmailService');
const { validationResult } = require('express-validator');

/**
 * Send email using email packet (Admin only)
 * POST /api/send-email
 */
const sendEmail = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            owner,
            id: emailPacketId,
            gameId,
            serverId
        } = req.body;

        const result = await sendEmailService.sendEmail(owner, emailPacketId, gameId, serverId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send email'
        });
    }
};

/**
 * Send email to single recipient (Admin only)
 * POST /api/send-email/single
 */
const sendSingleEmail = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            recipient,
            id: emailPacketId,
            gameId,
            serverId
        } = req.body;

        const result = await sendEmailService.sendSingleEmail(recipient, emailPacketId, gameId, serverId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error sending single email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send single email'
        });
    }
};

/**
 * Send email to multiple recipients (Admin only)
 * POST /api/send-email/bulk
 */
const sendBulkEmail = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            recipients,
            id: emailPacketId,
            gameId,
            serverId
        } = req.body;

        const result = await sendEmailService.sendBulkEmail(recipients, emailPacketId, gameId, serverId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error sending bulk email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send bulk email'
        });
    }
};

/**
 * Preview email content before sending (Admin only)
 * POST /api/send-email/preview
 */
const previewEmail = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id: emailPacketId } = req.body;

        // Get email packet
        const emailPacket = await emailPacketService.getPacketById(emailPacketId);
        if (!emailPacket) {
            return res.status(404).json({
                success: false,
                message: 'Email packet not found'
            });
        }

        // Convert items to game format
        const items = sendEmailService.convertItemsToGameFormat(
            emailPacket.game_items,
            emailPacket.equipment_items
        );

        res.json({
            success: true,
            message: 'Email preview generated successfully',
            data: {
                email_packet: {
                    id: emailPacket.id,
                    title: emailPacket.title,
                    content: emailPacket.content,
                    is_active: emailPacket.is_active,
                    total_sent: emailPacket.total_sent
                },
                converted_items: items,
                item_count: items.length,
                game_items_count: emailPacket.game_items?.items?.length || 0,
                equipment_items_count: emailPacket.equipment_items?.items?.length || 0
            }
        });

    } catch (error) {
        console.error('Error previewing email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to preview email'
        });
    }
};

/**
 * Get email list for player (Admin only)
 * GET /api/send-email/list/:serverid/:roleId
 */
const getEmailList = async (req, res) => {
    try {
        const { serverid, roleId } = req.params;

        const result = await sendEmailService.getEmailList(parseInt(serverid), roleId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error getting email list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email list'
        });
    }
};

/**
 * Sync global emails to player (Admin only)
 * POST /api/send-email/sync-global
 */
const syncGlobalEmails = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { serverid, roleId } = req.body;

        const result = await sendEmailService.syncGlobalEmailToPlayer(parseInt(serverid), roleId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error syncing global emails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync global emails'
        });
    }
};

/**
 * Cleanup expired emails (Admin only)
 * DELETE /api/send-email/cleanup/:serverid/:roleId
 */
const cleanupExpiredEmails = async (req, res) => {
    try {
        const { serverid, roleId } = req.params;
        const { daysToExpire = 30 } = req.query;

        const result = await sendEmailService.cleanupExpiredEmails(
            parseInt(serverid), 
            roleId, 
            parseInt(daysToExpire)
        );

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error cleaning up expired emails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired emails'
        });
    }
};

/**
 * Get send email statistics (Admin only)
 * GET /api/send-email/statistics
 */
const getSendEmailStatistics = async (req, res) => {
    try {
        const { gameId, serverId, dateFrom, dateTo } = req.query;

        // This would typically query a send_email_logs table
        // For now, return basic statistics
        const statistics = {
            total_emails_sent: 0,
            successful_sends: 0,
            failed_sends: 0,
            most_used_packets: [],
            recent_activity: []
        };

        res.json({
            success: true,
            data: {
                statistics,
                filters: {
                    gameId,
                    serverId,
                    dateFrom,
                    dateTo
                }
            }
        });

    } catch (error) {
        console.error('Error getting send email statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get send email statistics'
        });
    }
};

module.exports = {
    sendEmail,
    sendSingleEmail,
    sendBulkEmail,
    previewEmail,
    getEmailList,
    syncGlobalEmails,
    cleanupExpiredEmails,
    getSendEmailStatistics
};
