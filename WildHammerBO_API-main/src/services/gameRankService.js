const gameRanksModel = require('../models/gameRanks.js');

class GameRankService {
    async ArenaRankfindAll(page = 1, limit = 10) {
        try {
            return await gameRanksModel.ArenaRankfindAll(page, limit);
        } catch (error) {
            console.error('Error in GameRankService.ArenaRankfindAll:', error);
            throw new Error('Failed to fetch arena rankings');
        }
    }

    async lvlRankfindAll(page = 1, limit = 10) {
        try {
            return await gameRanksModel.lvlRankfindAll(page, limit);
        } catch (error) {
            console.error('Error in GameRankService.lvlRankfindAll:', error);
            throw new Error('Failed to fetch level rankings');
        }
    }

    async getUserRankDetails(userId) {
        try {
            return await gameRanksModel.getUserRankDetails(userId);
        } catch (error) {
            console.error('Error in GameRankService.getUserRankDetails:', error);
            throw new Error('Failed to fetch user rank details');
        }
    }

    async getTopPlayers(type = 'arena', limit = 10) {
        try {
            if (type === 'arena') {
                return await this.ArenaRankfindAll(1, limit);
            } else if (type === 'level') {
                return await this.lvlRankfindAll(1, limit);
            } else {
                throw new Error('Invalid ranking type. Use "arena" or "level"');
            }
        } catch (error) {
            console.error('Error in GameRankService.getTopPlayers:', error);
            throw error;
        }
    }
}

module.exports = new GameRankService();
