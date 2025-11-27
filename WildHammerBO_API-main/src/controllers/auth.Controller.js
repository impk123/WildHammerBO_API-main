const AuthService = require('../services/authService');

const authService = new AuthService();

exports.login = async (req, res) => {
  try {
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Get client info for logging
    const clientInfo = {
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    };

    // Authenticate admin
    const result = await authService.login(email, password);
    
    // Log activity with client info
    await authService.logActivity(result.admin.id, 'login', clientInfo);

    // Set JWT token in HTTP-only cookie
    res.cookie('admin_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: result.message,
      admin: result.admin,
      token: result.token
    });
  } catch (error) {
    //console.error('Login error:', error);
    res.status(401).json({ 
      success: false,
      message: error.message || 'Authentication failed' 
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Check if requester has permission to create admin (only super_admin can create)
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.admin_token;
    if (token) {
      try {
        const requester = await authService.verifyToken(token);
        if (!requester || requester.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            message: 'Only super admin can create new admin accounts'
          });
        }
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const adminData = { email, password, name, role: role || 'admin' };
    const result = await authService.register(adminData);

    res.status(201).json({
      success: true,
      message: result.message,
      admin: result.admin
    });
  } catch (error) {
    //console.error('Registration error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Registration failed' 
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.admin_token;
    
    if (token) {
      await authService.logout(token);
    }

    // Clear the authentication cookie
    res.clearCookie('admin_token');

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    //console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Logout failed' 
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.admin_token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const newToken = await authService.refreshToken(token);

    // Update cookie with new token
    res.cookie('admin_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    //console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false,
      message: error.message || 'Token refresh failed' 
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.admin_token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const admin = await authService.verifyToken(token);

    res.json({
      success: true,
      admin: admin
    });
  } catch (error) {
    //console.error('Get profile error:', error);
    res.status(401).json({ 
      success: false,
      message: error.message || 'Failed to get profile' 
    });
  }
};

exports.checkPermission = async (req, res) => {
  try {
    const { permission } = req.params;
    const adminId = req.admin?.id; // Set by auth middleware

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasPermission = await authService.checkPermission(adminId, permission);

    res.json({
      success: true,
      hasPermission: hasPermission
    });
  } catch (error) {
    //console.error('Permission check error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Permission check failed' 
    });
  }
};
