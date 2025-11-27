const Games = require('../models/games');

class GamesController {
    static async getAll(req, res) {
        try {
            const games = await Games.getAll();
            res.json({ 
                success: true, 
                data: games,
                message: 'Games retrieved successfully'
            });
        } catch (error) {
            console.error('Error getting games:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve games', 
                error: error.message 
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const game = await Games.getById(id);
            
            if (!game) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found' 
                });
            }

            res.json({ 
                success: true, 
                data: game,
                message: 'Game retrieved successfully'
            });
        } catch (error) {
            console.error('Error getting game by id:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve game', 
                error: error.message 
            });
        }
    }

    static async getByName(req, res) {
        try {
            const { name } = req.params;
            const game = await Games.getByName(name);
            
            if (!game) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found' 
                });
            }

            res.json({ 
                success: true, 
                data: game,
                message: 'Game retrieved successfully'
            });
        } catch (error) {
            console.error('Error getting game by name:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve game', 
                error: error.message 
            });
        }
    }

    static async create(req, res) {
        try {
            const gameData = req.body;
            
            // Validate required fields
            const requiredFields = ['name', 'secretkey', 'sku', 'serverNF'];
            for (const field of requiredFields) {
                if (!gameData[field]) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Missing required field: ${field}` 
                    });
                }
            }

            // Set default values for JSON fields if not provided
            gameData.gameUrl = gameData.gameUrl || [];
            gameData.channels = gameData.channels || [];
            gameData.whitelist = gameData.whitelist || [];
            gameData.blacklist = gameData.blacklist || [];
            gameData.info = gameData.info || {};

            const newGame = await Games.create(gameData);
            
            res.status(201).json({ 
                success: true, 
                data: newGame,
                message: 'Game created successfully'
            });
        } catch (error) {
            console.error('Error creating game:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to create game', 
                error: error.message 
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const gameData = req.body;

            // Check if game exists
            const existingGame = await Games.getById(id);
            if (!existingGame) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found' 
                });
            }

            const updated = await Games.update(id, gameData);
            
            if (updated) {
                const updatedGame = await Games.getById(id);
                res.json({ 
                    success: true, 
                    data: updatedGame,
                    message: 'Game updated successfully'
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to update game' 
                });
            }
        } catch (error) {
            console.error('Error updating game:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update game', 
                error: error.message 
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;

            // Check if game exists
            const existingGame = await Games.getById(id);
            if (!existingGame) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found' 
                });
            }

            const deleted = await Games.delete(id);
            
            if (deleted) {
                res.json({ 
                    success: true, 
                    message: 'Game deleted successfully'
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to delete game' 
                });
            }
        } catch (error) {
            console.error('Error deleting game:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete game', 
                error: error.message 
            });
        }
    }
}

module.exports = GamesController;
