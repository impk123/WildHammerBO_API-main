const { decodeGameToken } = require('../utils/jwtGameUtils');
const backendUserService = require('../services/backendUserSevice');
const roleInfoService = require('../services/roleinfoService');

/**
 * Get user information by userid with token validation
 * GET /api/userEvent/getInfo/:userid
 */
const getInfo = async (req, res) => {
    try {
        const token = req.query.token;
        const { userid } = req.params;

        // Validate token
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        // Decode token to get user information
        const decoded = decodeGameToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or failed to decode'
            });
        }

        // Extract userid from decoded token
        const tokenRoleId = decoded.id;
        
        if (!tokenRoleId) {
            return res.status(401).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        // ดึงข้อมูลจาก database
        const serverId = decoded.serverid||0;

        // // ดึงข้อมูลจาก service getRoleHeroByUserId
        // const roleInfoData = await roleInfoService.getRoleInfoById(tokenRoleId);
        // if (!roleInfoData) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'User ID not found in token'
        //     });
        // }

        const userData = await backendUserService.getUsersById(serverId, decoded.userid );

        if (!userData || userData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found in database'
            });
        }

        // Return user information
        res.json({
            success: true,
            message: 'User information retrieved successfully',
            data: {
                userid: userData[0].channelUserId,
                serverId: userData[0].channelAppId,                
                realMoney: userData[0].realMoney,
                email: userData[0].email,                
            }
        });

    } catch (error) {
        console.error('Error in getInfo endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getInfo
};
