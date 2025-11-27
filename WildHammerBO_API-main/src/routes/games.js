const express = require('express');
const router = express.Router();
const GamesController = require('../controllers/games.Controller');
const { authenticateToken } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/games - Get all games (id and name only for filter)
router.get('/', GamesController.getAll);

// GET /api/games/:id - Get game by ID
router.get('/:id', GamesController.getById);

// GET /api/games/name/:name - Get game by name
router.get('/name/:name', GamesController.getByName);

// POST /api/games - Create new game
router.post('/', GamesController.create);

// PUT /api/games/:id - Update game
router.put('/:id', GamesController.update);

// DELETE /api/games/:id - Delete game
router.delete('/:id', GamesController.delete);

module.exports = router;
