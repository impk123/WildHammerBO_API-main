const emailPacketModel = require('../models/emailPacket');

class EmailPacketService {
    // Get all email packets with pagination and filters
    async getAllPackets(page = 1, limit = 20, filters = {}) {
        return await emailPacketModel.findAll(page, limit, filters);
    }

    // Get email packet by id
    async getPacketById(id) {
        return await emailPacketModel.findById(id);
    }

    // Create new email packet
    async createPacket(packetData) {
        // Validate required fields
        if (!packetData.title) {
            return {
                success: false,
                message: 'Title is required'
            };
        }

        // Set default values
        const defaultData = {
            is_active: 1,
            created_at: new Date(),
            updated_at: new Date(),
            ...packetData
        };

        return await emailPacketModel.create(defaultData);
    }

    // Update email packet
    async updatePacket(id, packetData) {
        // Check if packet exists
        const existingPacket = await emailPacketModel.findById(id);
        if (!existingPacket) {
            return {
                success: false,
                message: 'Email packet not found'
            };
        }

        return await emailPacketModel.update(id, packetData);
    }

    // Delete email packet
    async deletePacket(id) {
        // Check if packet exists
        const existingPacket = await emailPacketModel.findById(id);
        if (!existingPacket) {
            return {
                success: false,
                message: 'Email packet not found'
            };
        }

        return await emailPacketModel.delete(id);
    }

    // Get active email packets
    async getActivePackets() {
        return await emailPacketModel.getActivePackets();
    }

    // Get email packet statistics
    async getStatistics() {
        return await emailPacketModel.getStatistics();
    }

    // Toggle packet active status
    async toggleActiveStatus(id) {
        return await emailPacketModel.toggleActiveStatus(id);
    }

    // Create draft email packet
    async createDraft(packetData) {
        const draftData = {
            title: packetData.title || 'Draft Email',
            content: packetData.content || '',
            game_items: packetData.game_items || null,
            equipment_items: packetData.equipment_items || null,
            is_active: 0, // Draft is inactive by default
            ...packetData
        };

        return await emailPacketModel.create(draftData);
    }

    // Publish draft (make it active)
    async publishDraft(id) {
        const packet = await emailPacketModel.findById(id);
        if (!packet) {
            return {
                success: false,
                message: 'Email packet not found'
            };
        }

        if (packet.is_active === 1) {
            return {
                success: false,
                message: 'Email packet is already published'
            };
        }

        return await emailPacketModel.update(id, { is_active: 1 });
    }

    // Get draft packets only
    async getDraftPackets() {
        return await emailPacketModel.findAll(1, 100, { is_active: 0 });
    }

    // Increment sent count
    async incrementSentCount(id) {
        return await emailPacketModel.incrementSentCount(id);
    }

    // Reset sent count
    async resetSentCount(id) {
        return await emailPacketModel.resetSentCount(id);
    }
}

const emailPacketService = new EmailPacketService();
module.exports = emailPacketService;
