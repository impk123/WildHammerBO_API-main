const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');

const backendUserController = require('../controllers/gameBackendUser.Controller');

router.use(authenticateToken);

// Get all users
router.get('/', backendUserController.getAllUsers);

// Refresh backend info user ID
router.get('/refresh/:userId', backendUserController.refreshUserId);

// Update backend user realmoney balance
router.put('/realmoney/:userId', backendUserController.updateUserRealmoney);

// Update backend user Update password
router.put('/updatepw/:userId', [
    body('newPassword')
        .isLength({ min: 3 })
        .withMessage('New password must be at least 3 characters long'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        })
], backendUserController.updateUserPassword);

module.exports = router;
