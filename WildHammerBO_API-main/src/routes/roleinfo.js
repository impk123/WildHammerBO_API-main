const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const roleInfoController = require('../controllers/roleinfo.Controller');



// Get all role info
router.get('/', roleInfoController.getAllRoleInfo);

router.use(authenticateToken);

// Get role info statistics
router.get('/stats', roleInfoController.getRoleInfoStats);

// Get role info by user id
router.get('/user/:userId', roleInfoController.getRoleInfoByUserId);

// Get role info by id
router.get('/:id', roleInfoController.getRoleInfoById);

// Create new role info
router.post('/', [
    body('id').notEmpty().withMessage('ID is required'),
    body('rolelevel').isInt().withMessage('Role level must be a number'),
    body('exp').isInt().withMessage('Experience must be a number'),
    body('gamelevels').isInt().withMessage('Game levels must be a number'),
    body('serverid').isInt().withMessage('Server ID must be a number'),
], roleInfoController.createRoleInfo);

// Update role info
router.put('/:id', roleInfoController.updateRoleInfo);

// Delete role info
router.delete('/:id', roleInfoController.deleteRoleInfo);

module.exports = router;
