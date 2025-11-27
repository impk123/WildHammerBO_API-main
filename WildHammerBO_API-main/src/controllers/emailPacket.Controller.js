const emailPacketService = require('../services/emailPacketService');
const { validationResult } = require('express-validator');
const jwtGameUtils = require('../utils/jwtGameUtils');
const sendEmailService = require('../services/sendEmailService');
const roleService = require('../services/roleService');
/**
 * Get all email packets with pagination and filters
 * GET /api/email-packets
 */
const getAllPackets = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            is_active,
            title
        } = req.query;

        const filters = {};
        
        if (is_active !== undefined) {
            filters.is_active = parseInt(is_active);
        }
        
        if (title) {
            filters.title = title;
        }

        const packets = await emailPacketService.getAllPackets(
            parseInt(page), 
            parseInt(limit), 
            filters
        );

        res.json({
            success: true,
            data: {
                packets,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: packets.length
                }
            }
        });

    } catch (error) {
        console.error('Error getting email packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email packets'
        });
    }
};

/**
 * Get single email packet by ID
 * GET /api/email-packets/:id
 */
const getPacketById = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const packet = await emailPacketService.getPacketById(packetId);

        if (!packet) {
            return res.status(404).json({
                success: false,
                message: 'Email packet not found'
            });
        }

        res.json({
            success: true,
            data: packet
        });

    } catch (error) {
        console.error('Error getting email packet by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email packet'
        });
    }
};

/**
 * Create new email packet (Admin only)
 * POST /api/email-packets
 */
const createPacket = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await emailPacketService.createPacket(req.body);

        if (result.success) {
            const newPacket = await emailPacketService.getPacketById(result.data.id);
            res.status(201).json({
                success: true,
                message: result.message,
                data: newPacket
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error creating email packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create email packet'
        });
    }
};

/**
 * Update email packet (Admin only)
 * PUT /api/email-packets/:id
 */
const updatePacket = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await emailPacketService.updatePacket(packetId, req.body);

        if (result.success) {
            const updatedPacket = await emailPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: result.message,
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error updating email packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update email packet'
        });
    }
};

/**
 * Delete email packet (Admin only)
 * DELETE /api/email-packets/:id
 */
const deletePacket = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await emailPacketService.deletePacket(packetId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error deleting email packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete email packet'
        });
    }
};

/**
 * Get active email packets
 * GET /api/email-packets/active
 */
const getActivePackets = async (req, res) => {
    try {
        const packets = await emailPacketService.getActivePackets();

        res.json({
            success: true,
            data: {
                active_packets: packets,
                total: packets.length
            }
        });

    } catch (error) {
        console.error('Error getting active email packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active email packets'
        });
    }
};

/**
 * Get draft email packets (Admin only)
 * GET /api/email-packets/drafts
 */
const getDraftPackets = async (req, res) => {
    try {
        const packets = await emailPacketService.getDraftPackets();

        res.json({
            success: true,
            data: {
                draft_packets: packets,
                total: packets.length
            }
        });

    } catch (error) {
        console.error('Error getting draft email packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get draft email packets'
        });
    }
};

/**
 * Create draft email packet (Admin only)
 * POST /api/email-packets/draft
 */
const createDraft = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await emailPacketService.createDraft(req.body);

        if (result.success) {
            const newPacket = await emailPacketService.getPacketById(result.data.id);
            res.status(201).json({
                success: true,
                message: 'Draft email packet created successfully',
                data: newPacket
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error creating draft email packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create draft email packet'
        });
    }
};

/**
 * Publish draft email packet (Admin only)
 * PATCH /api/email-packets/:id/publish
 */
const publishDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await emailPacketService.publishDraft(packetId);

        if (result.success) {
            const updatedPacket = await emailPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: 'Draft published successfully',
                data: updatedPacket
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error publishing draft:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish draft'
        });
    }
};

/**
 * Get email packet statistics (Admin only)
 * GET /api/email-packets/statistics
 */
const getStatistics = async (req, res) => {
    try {
        const statistics = await emailPacketService.getStatistics();

        res.json({
            success: true,
            data: {
                statistics
            }
        });

    } catch (error) {
        console.error('Error getting email packet statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get email packet statistics'
        });
    }
};

/**
 * Toggle packet active status (Admin only)
 * PATCH /api/email-packets/:id/toggle-active
 */
const toggleActiveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await emailPacketService.toggleActiveStatus(packetId);

        if (result.success) {
            const updatedPacket = await emailPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: 'Packet status toggled successfully',
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error toggling packet status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle packet status'
        });
    }
};

/**
 * Increment sent count (Admin only)
 * PATCH /api/email-packets/:id/increment-sent
 */
const incrementSentCount = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await emailPacketService.incrementSentCount(packetId);

        if (result.success) {
            const updatedPacket = await emailPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: 'Sent count incremented successfully',
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error incrementing sent count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to increment sent count'
        });
    }
};

/**
 * Reset sent count (Admin only)
 * PATCH /api/email-packets/:id/reset-sent
 */
const resetSentCount = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await emailPacketService.resetSentCount(packetId);

        if (result.success) {
            const updatedPacket = await emailPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: 'Sent count reset successfully',
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error resetting sent count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset sent count'
        });
    }
};

const sendEmailPacket = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id)||0;
        const roleId = req.body.roleid;
        const useridList = req.body.useridlist;
        const serverid = req.body.serverId;
        
        if(packetId<=0){
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }
        
    
        if(useridList.length==0 || serverid==0){
            return res.status(400).json({
                success: false,
                message: 'Invalid useridlist or serverid'
            });
        }
     
        const packet = await emailPacketService.getPacketById(packetId);
        if(!packet){
            return res.status(400).json({
                success: false,
                message: 'Packet not found'
            });
        }

        let gameItemsFormat = sendEmailService.convertPacketItemsToGameFormat(packet.game_items.items);
        const gameEquipmentFormat = sendEmailService.convertPacketEquipmentToGameFormat(packet.equipment_items.items);
        gameItemsFormat = gameItemsFormat.concat(gameEquipmentFormat);

        for(const userid of useridList){            
            const sendEmail = await sendEmailService.sendBuyPacketEmail(packet.title,packet.content,serverid,userid, gameItemsFormat);
            if(sendEmail.success==false){            
                return res.status(400).json({
                    success: false,
                    message: 'Failed to send mail'
                });
            }
        }

        res.json({
            success: true,
            message: 'email sent successfully',
            data: gameItemsFormat
        });

    }
    catch (error) {
        console.error('Error sending packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send packet'
        });
    }
};

const sendEmailPacketBulk = async (req, res) => {
    try {
        const serverid = req.body.serverId;
        const packetId = parseInt(req.body.packetId);

        if(packetId<=0){
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }
        
        const packet = await emailPacketService.getPacketById(packetId);
        if(!packet){
            return res.status(400).json({
                success: false,
                message: 'Packet not found'
            });
        }

        const useridList = await roleService.getAllRole(1,1000000,{serverId:serverid});
        if(useridList.length==0){
            return res.status(400).json({
                success: false,
                message: 'No users found'
            });
        }
        
        let gameItemsFormat = sendEmailService.convertPacketItemsToGameFormat(packet.game_items.items);
        const gameEquipmentFormat = sendEmailService.convertPacketEquipmentToGameFormat(packet.equipment_items.items);
        gameItemsFormat = gameItemsFormat.concat(gameEquipmentFormat);

        for(const userid of useridList){
            const sendEmail = await sendEmailService.sendBuyPacketEmail(packet.title,packet.content,serverid,userid.id, gameItemsFormat);
            if(sendEmail.success==false){            
                return res.status(400).json({
                    success: false,
                    message: 'Failed to send mail'
                });
            }
        }
        
    }
    catch (error) {
        console.error('Error sending packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send packet'
        });
    }
    
};

module.exports = {
    getAllPackets,
    getPacketById,
    createPacket,
    updatePacket,
    deletePacket,
    getActivePackets,
    getDraftPackets,
    createDraft,
    publishDraft,
    getStatistics,
    toggleActiveStatus,
    incrementSentCount,
    resetSentCount,
    sendEmailPacket,
    sendEmailPacketBulk
};
