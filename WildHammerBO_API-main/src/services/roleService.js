const roleModel = require('../models/role');

class RoleService {
    async getAllRole(page, limit, filters) {
        return await roleModel.findAll(page, limit, filters);
    }

    async getRoleById(id) {
        return await roleModel.getRoleById(id);
    }

    async getRoleByUserId(userId) {
        return await roleModel.getRoleByUserId(userId);
    }

    async updateRole(id, roleData, adminUsername) {
        return await roleModel.updateRole(id, roleData, adminUsername);
    }

    async deleteRole(id, adminUsername) {
        return await roleModel.deleteRole(id, adminUsername);
    }

    async createRole(roleData, adminUsername) {
        return await roleModel.createRole(roleData, adminUsername);
    }

    async getRoleStats() {
        return await roleModel.getRoleStats();
    }
}

const roleService = new RoleService();
module.exports = roleService;
