const jwt = require('jsonwebtoken');
const AuthService = require('../services/authService');

const authService = new AuthService();

// Middleware to verify JWT token
exports.authenticateToken = async (req, res, next) => {
    try {
        // Get token from Authorization header or cookies
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : req.cookies?.admin_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token and get admin data
        const admin = await authService.verifyToken(token);
        
        // Attach admin data to request object
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Middleware to check if admin has required role
exports.requireRole = (requiredRole) => {
    return (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (req.admin.role === 'super_admin') {
                // Super admin bypasses all role checks
                return next();
            }

            if (req.admin.role !== requiredRole) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. ${requiredRole} role required`
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

// Middleware to check if admin has required permission
exports.requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const hasPermission = await authService.checkPermission(req.admin.id, requiredPermission);
            
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. '${requiredPermission}' permission required`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Middleware to check multiple permissions (admin needs ANY of them)
exports.requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check if admin has any of the required permissions
            for (const permission of permissions) {
                const hasPermission = await authService.checkPermission(req.admin.id, permission);
                if (hasPermission) {
                    return next();
                }
            }

            return res.status(403).json({
                success: false,
                message: `Access denied. One of the following permissions required: ${permissions.join(', ')}`
            });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Optional authentication - doesn't fail if no token provided
exports.optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : req.cookies?.admin_token;

        if (token) {
            try {
                const admin = await authService.verifyToken(token);
                req.admin = admin;
            } catch (error) {
                // Token is invalid, but we don't fail the request
                console.warn('Optional auth - invalid token:', error.message);
            }
        }

        next();
    } catch (error) {
        console.error('Optional authentication error:', error);
        // Continue without authentication
        next();
    }
};
