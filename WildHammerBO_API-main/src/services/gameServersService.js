
const gameServers = require('../models/gameServers');


class GameServersService  { 
    async getAllGameServers(page, limit, filters) {
        return await gameServers.findAll(page, limit, filters);
    }
}

const gameServersService = new GameServersService();
module.exports = gameServersService;