
const express = require('express');
const router = express.Router();
const { login, register, logout, refreshToken, getProfile, checkPermission } = require('../controllers/auth.Controller');
const { authenticateToken, requireRole, requirePermission } = require('../middlewares/auth');
const { decodeGameToken } = require('../utils/jwtGameUtils');
const dotenv = require('dotenv');
// Public routes
router.post('/login', login);

// Protected routes
router.post('/register', authenticateToken, requireRole('super_admin'), register);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/profile', getProfile);

// Permission check endpoint - using POST to avoid path-to-regexp issues
router.post('/check-permission', authenticateToken, (req, res) => {
    const { permission } = req.body;
    if (!permission) {
        return res.status(400).json({
            success: false,
            message: 'Permission parameter is required'
        });
    }
    
    // Call the original checkPermission function but modify req.params
    req.params = { permission };
    return checkPermission(req, res);
});

// Test routes for role-based access
router.get('/admin-only', authenticateToken, requireRole('admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Access granted to admin area',
        admin: req.admin
    });
});

router.get('/super-admin-only', authenticateToken, requireRole('super_admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Access granted to super admin area',
        admin: req.admin
    });
});

router.get('/user-management', authenticateToken, requirePermission('user_management'), (req, res) => {
    res.json({
        success: true,
        message: 'Access granted to user management',
        admin: req.admin
    });
});

router.get('/reports', authenticateToken, requirePermission('reports'), (req, res) => {
    res.json({
        success: true,
        message: 'Access granted to reports',
        admin: req.admin
    });
});

router.post('/decode-auth-token', (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const decoded = decodeGameToken(token);

        if (!decoded) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token or failed to decode'
            });
        }

        res.json({
            success: true,
            message: 'Auth token decoded successfully',
            data: decoded
        });

    } catch (error) {
        console.error('Error in decode-auth-token endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



module.exports = router;
