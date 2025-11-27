const gachaPacketModel = require('../models/gachaPacket');

class GachaPacketService {
    // Get all gacha packets with pagination and filters
    async getAllPackets(page = 1, limit = 20, filters = {}) {
        return await gachaPacketModel.findAll(page, limit, filters);
    }

    // Get gacha packet by id
    async getPacketById(id) {
        return await gachaPacketModel.findById(id);
    }

    // Create new gacha packet
    async createPacket(packetData) {
        // Validate required fields
        if (!packetData.name || !packetData.item || packetData.prob_rate === undefined) {
            return {
                success: false,
                message: 'Name, item, and prob_rate are required'
            };
        }

        // Set default values
        const defaultData = {
            is_active: 1,
            is_equipment: 0,
            updated_at: new Date(),
            ...packetData
        };

        return await gachaPacketModel.create(defaultData);
    }

    // Update gacha packet
    async updatePacket(id, packetData) {
        // Check if packet exists
        const existingPacket = await gachaPacketModel.findById(id);
        if (!existingPacket) {
            return {
                success: false,
                message: 'Gacha packet not found'
            };
        }

        return await gachaPacketModel.update(id, packetData);
    }

    // Delete gacha packet
    async deletePacket(id) {
        // Check if packet exists
        const existingPacket = await gachaPacketModel.findById(id);
        if (!existingPacket) {
            return {
                success: false,
                message: 'Gacha packet not found'
            };
        }

        return await gachaPacketModel.delete(id);
    }

    // Get active gacha packets for game
    async getActivePackets() {
        return await gachaPacketModel.getActivePackets();
    }

    // Get gacha packet statistics
    async getStatistics() {
        return await gachaPacketModel.getStatistics();
    }

    async getGachaCost(){
        return await gachaPacketModel.getGachaCost();
    }

    async getGachaHistory(roleId, offset, limit){
        return await gachaPacketModel.getGachaHistory(roleId, offset, limit);
    }

    // Toggle packet active status
    async toggleActiveStatus(id) {
        const packet = await gachaPacketModel.findById(id);
        if (!packet) {
            return {
                success: false,
                message: 'Gacha packet not found'
            };
        }

        const newStatus = packet.is_active === 1 ? 0 : 1;
        return await gachaPacketModel.update(id, { is_active: newStatus });
    }

    // Toggle packet equipment status
    async toggleEquipmentStatus(id) {
        const packet = await gachaPacketModel.findById(id);
        if (!packet) {
            return {
                success: false,
                message: 'Gacha packet not found'
            };
        }

        const newStatus = packet.is_equipment === 1 ? 0 : 1;
        return await gachaPacketModel.update(id, { is_equipment: newStatus });
    }

    async insertHistory(serverid,username,roleid,cost,packetId){
        return await gachaPacketModel.insertHistory(serverid,username,roleid,cost,packetId);
    }

    async updateHistory(id,items){
        return await gachaPacketModel.updateHistory(id,items);
    }

    async updateHistorySendEmail(id,sendEmail,reason){
        return await gachaPacketModel.updateHistorySendEmail(id,sendEmail,reason);
    }
}

const gachaPacketService = new GachaPacketService();
module.exports = gachaPacketService;
