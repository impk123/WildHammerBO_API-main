const db = require('./db_wgbackend');
const crypto = require('crypto');

class gameServers {
    // Create a new gift code
    static async findAll(page = 1, limit = 20, filters = {}) {
        let query = `
            SELECT * FROM servers 
        `;

        const [rows] = await db.getPool().execute(query);

        return rows;
    }
}

module.exports = gameServers;