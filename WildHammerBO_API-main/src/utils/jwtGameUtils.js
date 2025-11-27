const jwt = require('jsonwebtoken');

/**
 * JWT Game Utility functions for encoding, decoding, and verifying game tokens
 */

/**
 * Decode JWT game token without verification
 * @param {string} token - JWT token to decode
 * @param {string} secret - Secret key for decoding (optional)
 * @returns {object|null} Decoded token payload or null if invalid
 */
const decodeGameToken = (token, secret = null) => {
    try {
        if (!token) {
            throw new Error('Token is required');
        }

        // Use provided secret or default game secret
        const decodeSecret = secret || process.env.JWT_GAME_SECRET || 'default-jwt-secret-key-for-development';
        
        const decoded = jwt.decode(token, decodeSecret);
        return decoded;
    } catch (error) {
        console.error('Error decoding JWT game token:', error.message);
        return null;
    }
};

/**
 * Verify JWT game token with signature validation
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification (optional)
 * @returns {object|null} Verified token payload or null if invalid
 */
const verifyGameToken = (token, secret = null) => {
    try {
        if (!token) {
            throw new Error('Token is required');
        }

        // Use provided secret or default game secret
        const verifySecret = secret || process.env.JWT_GAME_SECRET || 'default-jwt-secret-key-for-development';
        
        const decoded = jwt.verify(token, verifySecret);
        return decoded;
    } catch (error) {
        console.error('Error verifying JWT game token:', error.message);
        return null;
    }
};

/**
 * Generate JWT game token
 * @param {object} payload - Data to encode in token
 * @param {string} secret - Secret key for signing (optional)
 * @param {string|number} expiresIn - Token expiration time (optional)
 * @returns {string|null} Generated JWT token or null if error
 */
const generateGameToken = (payload, secret = null, expiresIn = null) => {
    try {
        if (!payload) {
            throw new Error('Payload is required');
        }

        // Use provided secret or default game secret
        const signSecret = secret || process.env.JWT_GAME_SECRET || 'default-jwt-secret-key-for-development';
        
        const options = {};
        if (expiresIn) {
            options.expiresIn = expiresIn;
        }

        const token = jwt.sign(payload, signSecret, options);
        return token;
    } catch (error) {
        console.error('Error generating JWT game token:', error.message);
        return null;
    }
};

/**
 * Check if game token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired, false otherwise
 */
const isGameTokenExpired = (token) => {
    try {
        const decoded = decodeGameToken(token);
        if (!decoded || !decoded.exp) {
            return true;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        console.error('Error checking game token expiration:', error.message);
        return true;
    }
};

/**
 * Get game token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
const getGameTokenExpiration = (token) => {
    try {
        const decoded = decodeGameToken(token);
        if (!decoded || !decoded.exp) {
            return null;
        }

        return new Date(decoded.exp * 1000);
    } catch (error) {
        console.error('Error getting game token expiration:', error.message);
        return null;
    }
};

/**
 * Extract game token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null if not found
 */
const extractGameTokenFromHeader = (authHeader) => {
    try {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        return authHeader.substring(7); // Remove 'Bearer ' prefix
    } catch (error) {
        console.error('Error extracting game token from header:', error.message);
        return null;
    }
};

module.exports = {
    decodeGameToken,
    verifyGameToken,
    generateGameToken,
    isGameTokenExpired,
    getGameTokenExpiration,
    extractGameTokenFromHeader
};
