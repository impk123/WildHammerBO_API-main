const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const roleHeroController = require('../controllers/rolehero.Controller');

router.use(authenticateToken);

// Get all role heroes
router.get('/', roleHeroController.getAllRoleHero);

// Get role heroes by user id
router.get('/user/:userId', roleHeroController.getRoleHeroByUserId);

// Get role hero by id
router.get('/:id', roleHeroController.getRoleHeroById);

// Create new role hero
router.post('/', [
    body('user_id').notEmpty().withMessage('User ID is required'),
    body('serverid').isInt().withMessage('Server ID must be a number'),
], roleHeroController.createRoleHero);

// Update role hero
router.put('/:id', roleHeroController.updateRoleHero);

// Delete role hero
router.delete('/:id', roleHeroController.deleteRoleHero);

module.exports = router;
