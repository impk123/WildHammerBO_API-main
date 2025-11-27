const emailPacketService = require('./emailPacketService');
const crypto = require('crypto');
const axios = require('axios');
const { redisManager } = require('../config/redis');
const db_webgame = require('../models/db_webgame');

class SendEmailService {
    constructor() {
        this.webApiConstants = {
            secret: process.env.WEB_API_SECRET || 'webapi2023yd99'
        };
        
        this.gameConst = {
            email_globalTag: 'GLOBAL'
        };

        this.GAME_SKU = process.env.GAME_SKU || 'PRO_NAME';
        this.EMAIL_CACHE_TTL = 3600; // 1 hour
    }

    // Generate MD5 hash for email verification
    generateMD5Hash(owner, title, serverid, items) {
        const str = `${this.webApiConstants.secret}|backend|${owner}|${title}|${serverid}|${JSON.stringify(items)}|`;
        return crypto.createHash('md5').update(str).digest('hex').toLowerCase();
    }

    // Convert email packet items to game format
    convertItemsToGameFormat(gameItems, equipmentItems) {
        const items = [];

        // Convert game items (simple items)
        if (gameItems && gameItems.items) {
            gameItems.items.forEach(item => {
                items.push({
                    i: item.item_id,
                    n: item.quantity
                });
            });
        }

        // Convert equipment items (with quality and attributes)
        if (equipmentItems && equipmentItems.items) {
            equipmentItems.items.forEach(item => {
                const equipmentItem = {
                    i: item.item_id,
                    n: item.quantity
                };

                // Add quality if exists
                if (item.quality) {
                    equipmentItem.q = item.quality;
                }

                // Add additional attributes if exists
                if (item.add_attributes) {
                    equipmentItem.add = item.add_attributes;
                }

                // Add base percentage if exists
                if (item.bper) {
                    equipmentItem.bper = item.bper;
                }

                items.push(equipmentItem);
            });
        }

        return items;
    }

    // Convert gacha items to game format (for gacha system)
    convertGachaItemsToGameFormat(gachaItems) {
        const items = [];

        if (!gachaItems || !Array.isArray(gachaItems)) {
            return items;
        }

        gachaItems.forEach(item => {
            const gameItem = {
                i: item.item_id,
                n: item.quantity
            };

            // Add quality if exists (for equipment)
            if (item.type=="equipment") {
                if (item.rarity) {
                    gameItem.q = parseInt(item.rarity);
                }
    
                // Add additional attributes if exists
                if (item.add_attributes) {
                    gameItem.add = item.add_attributes;
                }
    
                // Add base percentage if exists
                if (item.bper) {
                    gameItem.bper = item.bper;
                }
            }
           

            items.push(gameItem);
        });

        return items;
    }

    convertPacketItemsToGameFormat(packetItems) {
        const items = [];

        if (!packetItems || !Array.isArray(packetItems)) {
            return items;
        }

        packetItems.forEach(item => {
            const gameItem = {
                i: item.id,
                n: item.quantity
            };
            items.push(gameItem);
        });

        return items;
    }

    convertPacketEquipmentToGameFormat(packetEquipmentItems) {
        const items = [];
        const equipmentItems = [];

        if (!packetEquipmentItems || !Array.isArray(packetEquipmentItems)) {
            return items;
        }

        packetEquipmentItems.forEach(item => {
            const gameItem = {
                i: item.id,
                n: item.quantity
            };
            
            if (item.rarity) {
                gameItem.q = parseInt(item.rarity);
            }

            // Add additional attributes if exists
            if (item.add_attributes) {
                gameItem.add = item.add_attributes;
            }

            // Add base percentage if exists
            if (item.bper) {
                gameItem.bper = item.bper;
            }
            
            items.push(gameItem);
        });

        return items;
    }


    // Get main server ID (simplified version - implement merge logic as needed)
    async getMainServerId(gameId, serverId) {
        // This should be implemented based on your server merge logic
        // For now, return the same serverId
        return serverId;
    }

    // Validate game and server
    async validateGameAndServer(gameId, serverId) {
        // This should validate against your games and servers tables
        // For now, return true (implement actual validation)
        return {
            valid: true,
            game: { id: gameId },
            server: { id: serverId, gameUrl: process.env.GAME_SERVER_URL || 'http://localhost:3000' }
        };
    }

    // Generate unique email ID
    generateEmailId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }

    // Get Global Email from Redis
    async getGlobalEmail(serverid) {
        const key = `${this.GAME_SKU}_s${serverid}_email`;
        try {
            const emails = await redisManager.get(key);
            return emails ? JSON.parse(emails) : {};
        } catch (error) {
            console.error('Get global email error:', error);
            return {};
        }
    }

    // Save Global Email to Redis
    async saveGlobalEmail(serverid, emails) {
        if (!emails) {
            return false;
        }
        
        const key = `${this.GAME_SKU}_s${serverid}_email`;
        try {
            await redisManager.set(key, JSON.stringify(emails), this.EMAIL_CACHE_TTL);
            return true;
        } catch (error) {
            console.error('Save global email error:', error);
            return false;
        }
    }

    // Add Global Email to Redis
    async addGlobalEmail(serverid, emailEntity) {
        try {
            // 1. ดึงข้อมูล global email ปัจจุบัน
            const emails = await this.getGlobalEmail(serverid);
            
            // 2. ตรวจสอบว่า email ID ซ้ำหรือไม่
            if (emails[emailEntity.id]) {
                throw new Error(`Email ID ${emailEntity.id} already exists`);
            }
            
            // 3. เพิ่ม email ใหม่
            emails[emailEntity.id] = emailEntity;
            
            // 4. บันทึกลง Redis
            await this.saveGlobalEmail(serverid, emails);
            
            return true;
        } catch (error) {
            console.error('Add global email error:', error);
            return false;
        }
    }

    // Get Player Email from Redis
    async getPlayerEmail(serverid, roleId) {
        const key = `${this.GAME_SKU}_${serverid}_${roleId}_email`;
        try {
            const emails = await redisManager.get(key);
            return emails ? JSON.parse(emails) : {};
        } catch (error) {
            console.error('Get player email error:', error);
            return {};
        }
    }

    // Update Player Email in Redis
    async updatePlayerEmail(serverid, roleId, emails, saveTime = this.EMAIL_CACHE_TTL) {
        if (!emails) {
            return false;
        }
        
        const key = `${this.GAME_SKU}_${serverid}_${roleId}_email`;
        try {
            await redisManager.set(key, JSON.stringify(emails), saveTime);
            return true;
        } catch (error) {
            console.error('Update player email error:', error);
            return false;
        }
    }

    // Add Player Email to Redis
    async addPlayerEmail(serverid, roleId, emailEntity) {
        try {
            // 1. ดึงข้อมูล player email ปัจจุบัน
            const emails = await this.getPlayerEmail(serverid, roleId);
            
            // 2. ตรวจสอบว่า email ID ซ้ำหรือไม่
            if (emails[emailEntity.id]) {
                return false;
            }
            
            // 3. เพิ่ม email ใหม่
            emails[emailEntity.id] = emailEntity;
            
            // 4. บันทึกลง Redis
            return await this.updatePlayerEmail(serverid, roleId, emails);
            
        } catch (error) {
            console.error('Add player email error:', error);
            return false;
        }
    }

    // Send email to game server
    async sendEmailToGameServer(gameUrl, sendData) {
        try {
            const response = await axios.post(`${gameUrl}/email/sendEmail`, sendData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: response.data && response.data.ok,
                message: response.data?.msg || 'Send Failed',
                data: response.data
            };
        } catch (error) {
            console.error('Game server request failed:', error.message);
            return {
                success: false,
                message: 'Game Server Request Failed',
                error: error.message
            };
        }
    }

    // Main send email function
    async sendEmail(owner, emailPacketId, gameId, serverId) {
        try {
            // 1. Get email packet
            const emailPacket = await emailPacketService.getPacketById(emailPacketId);
            if (!emailPacket) {
                return {
                    success: false,
                    message: 'Email packet not found'
                };
            }

            // 2. Validate game and server
            const validation = await this.validateGameAndServer(gameId, serverId);
            if (!validation.valid) {
                return {
                    success: false,
                    message: 'Game or Server not found'
                };
            }

            // 3. Get main server ID
            const mainServerId = await this.getMainServerId(gameId, serverId);

            // 4. Check if owner is array (multiple recipients)
            const recipients = Array.isArray(owner) ? owner : [owner];

            // 5. Convert items to game format
            const items = this.convertItemsToGameFormat(
                emailPacket.game_items,
                emailPacket.equipment_items
            );

            // 6. Send email to each recipient
            const results = [];
            for (const recipient of recipients) {
                // Check global email restriction
                if (recipient === this.gameConst.email_globalTag && serverId !== mainServerId) {
                    results.push({
                        recipient,
                        success: false,
                        message: 'Merge Server Cannot Send Global Email'
                    });
                    continue;
                }

                // Generate unique email ID
                const emailId = this.generateEmailId();

                // Create Email Entity for Redis
                const emailEntity = {
                    id: emailId,
                    serverid: mainServerId,
                    title: emailPacket.title,
                    content: emailPacket.content,
                    items: items,
                    state: 0, // UNREAD
                    sender: 'backend',
                    owner: recipient,
                    time: new Date().toISOString()
                };

                // Add to Redis Cache
                let redisSuccess = false;
                if (recipient === this.gameConst.email_globalTag) {
                    // Global Email
                    redisSuccess = await this.addGlobalEmail(mainServerId, emailEntity);
                } else {
                    // Player Email
                    redisSuccess = await this.addPlayerEmail(mainServerId, recipient, emailEntity);
                }

                if (!redisSuccess) {
                    results.push({
                        recipient,
                        success: false,
                        message: 'Failed to add email to Redis cache'
                    });
                    continue;
                }

                // Generate MD5 hash
                const md5Key = this.generateMD5Hash(recipient, emailPacket.title, mainServerId, items);

                // Prepare send data
                const sendData = {
                    key: md5Key,
                    serverid: mainServerId,
                    sender: 'backend',
                    title: emailPacket.title,
                    content: emailPacket.content,
                    items: items,
                    owner: recipient
                };

                // Send to game server
                const result = await this.sendEmailToGameServer(validation.server.gameUrl, sendData);
                
                results.push({
                    recipient,
                    success: result.success,
                    message: result.message,
                    emailId: emailId
                });

                // If successful, increment sent count
                if (result.success) {
                    await emailPacketService.incrementSentCount(emailPacketId);
                }
            }

            // 7. Return results
            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;

            return {
                success: successCount > 0,
                message: `Sent ${successCount}/${totalCount} emails successfully`,
                data: {
                    email_packet_id: emailPacketId,
                    total_recipients: totalCount,
                    successful_sends: successCount,
                    failed_sends: totalCount - successCount,
                    results: results
                }
            };

        } catch (error) {
            console.error('Send email error:', error);
            return {
                success: false,
                message: 'Internal Server Error',
                error: error.message
            };
        }
    }

    // Send email to multiple recipients with same packet
    async sendBulkEmail(recipients, emailPacketId, gameId, serverId) {
        return await this.sendEmail(recipients, emailPacketId, gameId, serverId);
    }

    // Send email to single recipient
    async sendSingleEmail(recipient, emailPacketId, gameId, serverId) {
        return await this.sendEmail(recipient, emailPacketId, gameId, serverId);
    }

    async sendGachaEmail(title,content,serverId,owner, formatedItems) {
        try {

            const emailId = this.generateEmailId();


            const emailEntity = {
                id: emailId,
                serverid: serverId,
                title: title,
                content: content,
                items: formatedItems,
                state: 0, 
                sender: 'backend',
                owner: owner,
                time: new Date().toISOString()
            };

            const redisSuccess = await this.addPlayerEmail(serverId, owner, emailEntity);

            if (!redisSuccess) {
                return {
                    success: false,
                    message: 'Failed to add email to Redis cache'
                };
            }

            //lyz_webgame.emails
            const result = await db_webgame.getPool().execute(`
                INSERT INTO email (id, serverid, title, content, items, state, sender, owner, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [emailId, serverId, title, content, formatedItems, 0, 'backend', owner]);
           
          
            return {
                success: true,
                message: 'Gacha email sent successfully',
                data: {
                    item: formatedItems
                }
            };

        } catch (error) {
            console.error('Send gacha email error:', error);
            return {
                success: false,
                message: 'Internal Server Error',
                error: error.message
            };
        }
    }

    async sendBuyPacketEmail(title,content,serverId,owner, formatedItems) {
        try {

            const emailId = this.generateEmailId();


            const emailEntity = {
                id: emailId,
                serverid: serverId,
                title: title,
                content: content,
                items: formatedItems,
                state: 0, 
                sender: 'backend',
                owner: owner,
                time: new Date().toISOString()
            };

            const redisSuccess = await this.addPlayerEmail(serverId, owner, emailEntity);

            if (!redisSuccess) {
                return {
                    success: false,
                    message: 'Failed to add email to Redis cache'
                };
            }

            //lyz_webgame.emails
            const result = await db_webgame.getPool().execute(`
                INSERT INTO email (id, serverid, title, content, items, state, sender, owner, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [emailId, serverId, title, content, formatedItems, 0, 'backend', owner]);
           
          
            return {
                success: true,
                message: 'Gacha email sent successfully',
                data: {
                    item: formatedItems
                }
            };

        } catch (error) {
            console.error('Send gacha email error:', error);
            return {
                success: false,
                message: 'Internal Server Error',
                error: error.message
            };
        }
    }

    // Get email list for player
    async getEmailList(serverid, roleId) {
        try {
            // 1. ดึงข้อมูล player email
            const playerEmails = await this.getPlayerEmail(serverid, roleId);
            
            // 2. ดึงข้อมูล global email
            const globalEmails = await this.getGlobalEmail(serverid);
            
            return {
                success: true,
                message: 'Email list retrieved successfully',
                data: {
                    emails: playerEmails,
                    globalEmails: globalEmails
                }
            };
        } catch (error) {
            console.error('Get email list error:', error);
            return {
                success: false,
                message: 'Failed to get email list',
                error: error.message
            };
        }
    }

    // Sync global email to player
    async syncGlobalEmailToPlayer(serverid, roleId) {
        try {
            // 1. ดึงข้อมูล global email
            const globalEmails = await this.getGlobalEmail(serverid);
            
            // 2. ดึงข้อมูล player email
            const playerEmails = await this.getPlayerEmail(serverid, roleId);
            
            // 3. ตรวจสอบ global email ใหม่ที่ยังไม่ได้ sync
            let hasNewEmails = false;
            for (const [emailId, globalEmail] of Object.entries(globalEmails)) {
                if (!playerEmails[emailId] && globalEmail.state !== 3) { // 3 = Deleted
                    // เพิ่ม global email ใหม่เข้า player email
                    playerEmails[emailId] = {
                        ...globalEmail,
                        state: 0 // UNREAD
                    };
                    hasNewEmails = true;
                }
            }
            
            // 4. บันทึกข้อมูลที่อัปเดตแล้ว
            if (hasNewEmails) {
                await this.updatePlayerEmail(serverid, roleId, playerEmails);
            }
            
            return {
                success: true,
                message: hasNewEmails ? 'Global emails synced successfully' : 'No new global emails to sync',
                data: {
                    synced: hasNewEmails,
                    totalEmails: Object.keys(playerEmails).length
                }
            };
        } catch (error) {
            console.error('Sync global email error:', error);
            return {
                success: false,
                message: 'Failed to sync global emails',
                error: error.message
            };
        }
    }

    // Cleanup expired emails
    async cleanupExpiredEmails(serverid, roleId, daysToExpire = 30) {
        try {
            const emails = await this.getPlayerEmail(serverid, roleId);
            const now = new Date();
            const expiredEmails = [];
            
            // หาอีเมลที่หมดอายุ
            for (const [emailId, email] of Object.entries(emails)) {
                const emailDate = new Date(email.time);
                const daysDiff = (now.getTime() - emailDate.getTime()) / (1000 * 3600 * 24);
                
                if (daysDiff > daysToExpire) {
                    expiredEmails.push(emailId);
                }
            }
            
            // ลบอีเมลที่หมดอายุ
            for (const emailId of expiredEmails) {
                delete emails[emailId];
            }
            
            // บันทึกข้อมูลที่อัปเดตแล้ว
            await this.updatePlayerEmail(serverid, roleId, emails);
            
            return {
                success: true,
                message: `Cleaned up ${expiredEmails.length} expired emails`,
                data: {
                    removedCount: expiredEmails.length,
                    remainingCount: Object.keys(emails).length
                }
            };
        } catch (error) {
            console.error('Cleanup expired emails error:', error);
            return {
                success: false,
                message: 'Failed to cleanup expired emails',
                error: error.message
            };
        }
    }
}

const sendEmailService = new SendEmailService();
module.exports = sendEmailService;
