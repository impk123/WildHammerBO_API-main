const db_wgbackend = require('./db_wgbackend');

class Games {
    static async getAll() {
        try {
            const query = `SELECT id, name FROM games ORDER BY id ASC`;
            console.log(query);
            const [rows] = await db_wgbackend.getPool().execute(query);
            return rows;
        } catch (error) {
            console.error('Error getting games:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const query = `SELECT id, name, secretkey, sku, serverNF, gameUrl, channels, whitelist, blacklist, createdAt, updatedAt, info FROM games WHERE id = ?`;
            const [rows] = await db_wgbackend.getPool().execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting game by id:', error);
            throw error;
        }
    }

    static async getByName(name) {
        try {
            const query = `SELECT id, name, secretkey, sku, serverNF, gameUrl, channels, whitelist, blacklist, createdAt, updatedAt, info FROM games WHERE name = ?`;
            const [rows] = await db_wgbackend.getPool().execute(query, [name]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting game by name:', error);
            throw error;
        }
    }

    static async create(gameData) {
        try {
            const {
                name, secretkey, sku, serverNF, gameUrl, channels, 
                whitelist, blacklist, info
            } = gameData;

            const query = `
                INSERT INTO games (name, secretkey, sku, serverNF, gameUrl, channels, whitelist, blacklist, info)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await db_wgbackend.getPool().execute(query, [
                name, secretkey, sku, serverNF, 
                JSON.stringify(gameUrl), 
                JSON.stringify(channels), 
                JSON.stringify(whitelist), 
                JSON.stringify(blacklist), 
                JSON.stringify(info)
            ]);

            return { id: result.insertId, ...gameData };
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

    static async update(id, gameData) {
        try {
            const {
                name, secretkey, sku, serverNF, gameUrl, channels, 
                whitelist, blacklist, info
            } = gameData;

            const query = `
                UPDATE games 
                SET name = ?, secretkey = ?, sku = ?, serverNF = ?, 
                    gameUrl = ?, channels = ?, whitelist = ?, blacklist = ?, info = ?
                WHERE id = ?
            `;
            
            const [result] = await db_wgbackend.getPool().execute(query, [
                name, secretkey, sku, serverNF, 
                JSON.stringify(gameUrl), 
                JSON.stringify(channels), 
                JSON.stringify(whitelist), 
                JSON.stringify(blacklist), 
                JSON.stringify(info),
                id
            ]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating game:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const query = `DELETE FROM games WHERE id = ?`;
            const [result] = await db_wgbackend.getPool().execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting game:', error);
            throw error;
        }
    }
}

module.exports = Games;
