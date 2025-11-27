const GamePacketModel = require('../models/gamePacket');
const { validationResult } = require('express-validator');
const jwtGameUtils = require('../utils/jwtGameUtils');
const gameBackendUserModel = require('../models/gameBackendUser');
const sendEmailService = require('../services/sendEmailService');
const backendUserService = require('../services/backendUserSevice');
const PrizeSettingService = require('../services/prizeSettingService');

/**
 * Get all game packets
 * GET /api/packets
 */
const getAllPackets = async (req, res) => {
    try {
        const {
            is_active,
            is_featured,
            packet_type,
            level_requirement,
            limit,
            offset
        } = req.query;
       
        const filters = {};
       
        if (is_active !== undefined) {
            filters.is_active = parseInt(is_active);
        }

        if (is_featured !== undefined) {
            filters.is_featured = parseInt(is_featured);
        }

        if (packet_type) {
            filters.packet_type = packet_type;
        }

        if (level_requirement) {
            filters.level_requirement = parseInt(level_requirement);
        }

        if (limit) {
            filters.limit = parseInt(limit);
        }

        if (offset) {
            filters.offset = parseInt(offset);
        }

        const packets = await GamePacketModel.findAll(filters);

        res.json({
            success: true,
            data: {
                packets,
                total: packets.length,
                filters
            }
        });

    } catch (error) {
        console.error('Error getting game packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get game packets'
        });
    }
};

/**
 * Get single packet by ID with items
 * GET /api/packets/:id
 */
const getPacketById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('getPacketById called with id:', id);

        const packetId = parseInt(id, 10);
        console.log('Parsed packetId:', packetId);
        
        if (isNaN(packetId) || packetId <= 0) {
            console.log('Invalid packet ID:', packetId);
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        console.log('Calling GamePacketModel.findById with:', packetId);
        const packet = await GamePacketModel.findById(packetId);
        console.log('GamePacketModel.findById result:', packet ? 'found' : 'null');

        if (!packet) {
            console.log('Packet not found for ID:', packetId);
            return res.status(404).json({
                success: false,
                message: 'Packet not found'
            });
        }

        console.log('Returning packet successfully');
        res.json({
            success: true,
            data: packet
        });

    } catch (error) {
        console.error('Error getting packet by ID:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to get packet'
        });
    }
};

/**
 * Create new game packet (Admin only)
 * POST /api/packets
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
        
        const packetData = req.body;
        const packetId = await GamePacketModel.create(packetData);

        const newPacket = await GamePacketModel.findById(packetId);

        res.status(201).json({
            success: true,
            message: 'Game packet created successfully',
            data: newPacket
        });

    } catch (error) {
        console.error('Error creating game packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create game packet'
        });
    }
};

/**
 * Update game packet (Admin only)
 * PUT /api/packets/:id
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

        const updated = await GamePacketModel.update(packetId, req.body);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Packet not found'
            });
        }

        const updatedPacket = await GamePacketModel.findById(packetId);

        res.json({
            success: true,
            message: 'Game packet updated successfully',
            data: updatedPacket
        });

    } catch (error) {
        console.error('Error updating game packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update game packet'
        });
    }
};

/**
 * Delete game packet (Admin only)
 * DELETE /api/packets/:id
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

        const deleted = await GamePacketModel.delete(packetId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Packet not found'
            });
        }

        res.json({
            success: true,
            message: 'Game packet deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting game packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete game packet'
        });
    }
};

/**
 * Add item to packet (Admin only)
 * POST /api/packets/:id/items
 */
const addPacketItem = async (req, res) => {
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

        // Check if packet exists
        const packet = await GamePacketModel.findById(packetId);
        if (!packet) {
            return res.status(404).json({
                success: false,
                message: 'Packet not found'
            });
        }

        const itemId = await GamePacketModel.addItem(packetId, req.body);

        res.status(201).json({
            success: true,
            message: 'Item added to packet successfully',
            data: {
                item_id: itemId,
                packet_id: packetId
            }
        });

    } catch (error) {
        console.error('Error adding packet item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to packet'
        });
    }
};

/**
 * Update packet item (Admin only)
 * PUT /api/packets/items/:itemId
 */
const updatePacketItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const itemIdNum = parseInt(itemId, 10);

        if (isNaN(itemIdNum) || itemIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid item ID'
            });
        }

        const updated = await GamePacketModel.updateItem(itemIdNum, req.body);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        res.json({
            success: true,
            message: 'Packet item updated successfully'
        });

    } catch (error) {
        console.error('Error updating packet item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update packet item'
        });
    }
};

/**
 * Remove item from packet (Admin only)
 * DELETE /api/packets/items/:itemId
 */
const removePacketItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const itemIdNum = parseInt(itemId, 10);

        if (isNaN(itemIdNum) || itemIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid item ID'
            });
        }

        const removed = await GamePacketModel.removeItem(itemIdNum);

        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        res.json({
            success: true,
            message: 'Item removed from packet successfully'
        });

    } catch (error) {
        console.error('Error removing packet item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from packet'
        });
    }
};

/**
 * Purchase packet with user currency
 * POST /api/gamepackets/purchase/:id
 */
const purchasePacket = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id);
        const token = req.body.token;

        if(token==''){
            return res.status(400).json({
                success: false,
                message: 'Invalid token, username or serverid'
            });
        }
    
        //decode token
        const decoded = jwtGameUtils.decodeGameToken(token);
        const roleId = decoded.id;
        const userid = decoded.userid || '';
        const serverid = decoded.serverid || 0;

        if(userid=='' || serverid==0){
            return res.status(400).json({
                success: false,
                message: 'Invalid username or userid'
            });
        }

        //check expire
        if(decoded.exp < Date.now()/1000){
            return res.status(400).json({
                success: false,
                message: 'Token expired'
            });
        }

        const packet = await GamePacketModel.findByIdAndRoleid(packetId,roleId);
        if(!packet){
            return res.status(400).json({
                success: false,
                message: 'Packet not found'
            });
        }

        //check limit purchase
        if(packet.max_purchases_per_user && packet.total_purchases && packet.total_purchases >=0 && packet.max_purchases_per_user > 0){
            if(packet.total_purchases >= packet.max_purchases_per_user){
                return res.status(400).json({
                    success: false,
                        message: 'Maximum purchases reached'
                    });
            }
        }

        //check daily purchase limit
        if(packet.daily_purchase_limit && packet.today_purchases && packet.today_purchases >=0 && packet.daily_purchase_limit > 0){
            if(packet.today_purchases >= packet.daily_purchase_limit){
                return res.status(400).json({
                    success: false,
                        message: 'Daily purchase limit reached'
                });
            }
        }

        //get user info
        const users = await gameBackendUserModel.findById(serverid,userid);
        if(!users){
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        if(packet.price_token == null || packet.price_token == undefined || user.realMoney == null || user.realMoney == undefined ){
            return res.status(400).json({
                success: false,
                message: 'Price token is required'
            });
        }

        //check insufficient tokens
        if(user.realMoney < packet.price_token){
            return res.status(400).json({
                success: false,
                message: 'Insufficient Token'
            });
        }

        const resultReduceMoney = await backendUserService.reduceRealmoney(serverid,userid,packet.price_token);
        if(resultReduceMoney.affectedRows==0){
            return res.status(400).json({
                success: false,
                message: 'Failed to reduce money'
            });
        }

        let gameItemsFormat = sendEmailService.convertPacketItemsToGameFormat(packet.game_items);
        const gameEquipmentFormat = sendEmailService.convertPacketEquipmentToGameFormat(packet.equipment_items);

        gameItemsFormat = gameItemsFormat.concat(gameEquipmentFormat);

        //insert packet purchase history
        const resultInsertPacketPurchaseHistory = await GamePacketModel.insertPacketPurchaseHistory(serverid,userid,roleId,packet.price_token,packetId,gameItemsFormat);
        if(resultInsertPacketPurchaseHistory.affectedRows==0){
            return res.status(400).json({
                success: false,
                message: 'Failed to insert packet purchase history'
            });
        }

        const sendEmail = await sendEmailService.sendBuyPacketEmail('ซื้อไอเท็ม','กดเพื่อรับสินค้า',serverid,roleId, gameItemsFormat);
        if(sendEmail.success==false){
            //refund money
            const resultRefundMoney = await backendUserService.refundRealmoney(serverid,userid,packet.price_token);            
            return res.status(400).json({
                success: false,
                message: 'Failed to send mail buy packet'
            });
        }

        const resultUpdateHistorySendEmail = await GamePacketModel.updateHistorySendEmail(resultInsertPacketPurchaseHistory.data.id,1,'');
        if(resultUpdateHistorySendEmail.success==false){
            return res.status(400).json({
                success: false,
                message: 'Failed to update history send email'
            });
        }

        const resultIncreaseTotalBuytoken = await PrizeSettingService.increaseTotalBuytoken(serverid, packet.price_token);
        if(resultIncreaseTotalBuytoken.success==false){
            return res.status(400).json({
                success: false,
                message: 'Failed to increase total buytoken'
            });
        }

        //Update total purchases in redis
        try {
            const PlayerDataService = require('../services/playerDataService');
            await PlayerDataService.addPriceToken(serverid, roleId, packet.price_token);
            
            //console.log(`Updated total purchases in Redis for player ${roleId} on server ${serverid}: +${totalPrice}`);
        } catch (redisError) {
            console.error('Failed to update Redis:', redisError);
            // Don't fail the purchase if Redis update fails
        }

        res.json({
            success: true,
            message: 'Packet purchased successfully',
            data: gameItemsFormat
        });

    } catch (error) {
        console.error('Error purchasing packet:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to purchase packet'
        });
    }
};

/**
 * Check if user can purchase packet
 * GET /api/packets/:id/can-purchase
 */
const checkCanPurchase = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const userId = req.user ? req.user.id : req.query.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const result = await GamePacketModel.canUserPurchase(userId, packetId);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error checking purchase eligibility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check purchase eligibility'
        });
    }
};

/**
 * Get user's packet purchase history
 * GET /api/user/packets/history
 */
const getUserPurchaseHistory = async (req, res) => {
    try {
        const token = req.query.token||'';        
                
                if(token==''){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid token, username or serverid'
                    });
                }
        
                //decode token
                const decoded = jwtGameUtils.decodeGameToken(token);
                const roleId = decoded.id;
                const userid = decoded.userid || '';
                const serverid = decoded.serverid || 0;

                if(roleId=='' || userid=='' || serverid==0){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid roleId, userid or serverid'
                    });
                }
        
                // check expire
                if(decoded.exp < Date.now()/1000){
                    return res.status(400).json({
                        success: false,
                        message: 'Token expired'
                    });
                }
        

        
        // ส่งค่าเป็น number ไปยัง model
        let { limit = 20, offset = 0 } = req.query;
        limit = parseInt(limit) || 20;
        offset = parseInt(offset) || 0;

        const history = await GamePacketModel.getUserPurchaseHistory(
            roleId, 
            limit, 
            offset
        );

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    limit: limit,
                    offset: offset,
                    total: history.length
                }
            }
        });

    } catch (error) {
        console.error('Error getting user purchase history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get purchase history'
        });
    }
};

/**
 * Get packet statistics (Admin only)
 * GET /api/packets/statistics
 */
const getPacketStatistics = async (req, res) => {
    try {
        const statistics = await GamePacketModel.getStatistics();

        res.json({
            success: true,
            data: {
                statistics,
                summary: {
                    total_packets: statistics.length,
                    total_purchases: statistics.reduce((sum, stat) => sum + stat.total_purchases, 0),
                    total_revenue_tokens: statistics.reduce((sum, stat) => sum + (stat.total_tokens_earned || 0), 0)
                }
            }
        });

    } catch (error) {
        console.error('Error getting packet statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get packet statistics'
        });
    }
};

/**
 * Get featured packets for user
 * GET /api/packets/featured
 */
const getFeaturedPackets = async (req, res) => {
    try {
        const { level_requirement } = req.query;

        const filters = {
            is_active: 1,
            is_featured: 1
        };

        if (level_requirement) {
            filters.level_requirement = parseInt(level_requirement);
        }

        const packets = await GamePacketModel.findAll(filters);

        res.json({
            success: true,
            data: {
                featured_packets: packets,
                total: packets.length
            }
        });

    } catch (error) {
        console.error('Error getting featured packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get featured packets'
        });
    }
};

module.exports = {
    getAllPackets,
    getPacketById,
    createPacket,
    updatePacket,
    deletePacket,
    addPacketItem,
    updatePacketItem,
    removePacketItem,
    purchasePacket,
    checkCanPurchase,
    getUserPurchaseHistory,
    getPacketStatistics,
    getFeaturedPackets
};