const roleHeroModel = require('../models/rolehero');

class RoleHeroService {
    async getAllRoleHero(page, limit, filters) {
        return await roleHeroModel.findAll(page, limit, filters);
    }

    async getRoleHeroByUserId(userId) {
        return await roleHeroModel.getRoleHeroByUserId(userId);
    }

    async getRoleHeroById(id) {
        return await roleHeroModel.getRoleHeroById(id);
    }

    async updateRoleHero(id, heroData, adminUsername) {
        return await roleHeroModel.updateRoleHero(id, heroData, adminUsername);
    }

    async deleteRoleHero(id, adminUsername) {
        return await roleHeroModel.deleteRoleHero(id, adminUsername);
    }

    async createRoleHero(heroData, adminUsername) {
        return await roleHeroModel.createRoleHero(heroData, adminUsername);
    }
}

const roleHeroService = new RoleHeroService();
module.exports = roleHeroService;
