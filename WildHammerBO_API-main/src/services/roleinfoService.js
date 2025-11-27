const roleInfoModel = require('../models/roleinfo');

class RoleInfoService {
    async getAllRoleInfo(page, limit, filters) {
        return await roleInfoModel.findAll(page, limit, filters);
    }

    async getRoleInfoById(id) {
        return await roleInfoModel.getRoleInfoById(id);
    }

    async getRoleInfoByUserId(userId) {
        return await roleInfoModel.getRoleInfoByUserId(userId);
    }

    async updateRoleInfo(id, roleData, adminUsername) {
        return await roleInfoModel.updateRoleInfo(id, roleData, adminUsername);
    }

    async deleteRoleInfo(id, adminUsername) {
        return await roleInfoModel.deleteRoleInfo(id, adminUsername);
    }

    async createRoleInfo(roleData, adminUsername) {
        return await roleInfoModel.createRoleInfo(roleData, adminUsername);
    }

    async getRoleInfoStats() {
        return await roleInfoModel.getRoleInfoStats();
    }
}

const roleInfoService = new RoleInfoService();
module.exports = roleInfoService;
