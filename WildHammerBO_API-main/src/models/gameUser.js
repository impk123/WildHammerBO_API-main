const db = require('./db_webgame');
const crypto = require('crypto');

class gameUserModel {
    // Create a new gift code
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM role
        `;

        const [rows] = await db.getPool().execute(query);
        
        return rows;
    }
   
}

module.exports = gameUserModel;
