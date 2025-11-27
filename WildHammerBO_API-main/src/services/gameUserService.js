const gameUserModel = require('../models/gameUser');


class GameUserService {
    async getAllUsers(page, limit, filters) {
        return await gameUserModel.findAll(page, limit, filters);
    }
}

const gameUserService = new GameUserService();
module.exports = gameUserService;