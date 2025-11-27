const gameEquipModel = require('../models/gameEquip');


class GameEquipService  { 
    async getAllEquip(page, limit, filters) {
        return await gameEquipModel.findAll(page, limit, filters);
    }

    async getEquipByUserId(userId) {
        return await gameEquipModel.getEquipByUserId(userId);
    }

    async updateEquip(userId, equipData, adminUsername) {
        return await gameEquipModel.updateEquip(userId, equipData, adminUsername);
    }

    async deleteEquip(userId, equipId, adminUsername) {
        return await gameEquipModel.deleteEquip(userId, equipId, adminUsername);
    }
}

const gameEquipService = new GameEquipService();
module.exports = gameEquipService;  