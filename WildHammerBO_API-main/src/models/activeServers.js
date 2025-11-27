const db = require('./db_backoffice');

class ActiveServers {
    // Get active servers list from active_servers table
    static async getActiveServers() {
        try {
            const query = `SELECT * FROM active_servers WHERE id = 1`;
            const [rows] = await db.getPool().execute(query);
            
            if (rows.length === 0) {
                return {
                    success: false,
                    message: 'No active servers configuration found',
                    serverIds: [],
                    iosVersionCode: null,
                    androidVersionCode: null
                };
            }
            
            const activeServerRecord = rows[0];
            let serverIds = [];
            
            // Parse server_id_list from varchar to array
            if (activeServerRecord.server_id_list) {
                try {
                    // Remove brackets and split by comma, then convert to integers
                    const cleanString = activeServerRecord.server_id_list.replace(/[\[\]]/g, '');
                    serverIds = cleanString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                } catch (parseError) {
                    console.error('Error parsing server_id_list:', parseError);
                    serverIds = [];
                }
            }
            
            return {
                success: true,
                serverIds: serverIds,
                iosVersionCode: activeServerRecord.ios_version_code || null,
                androidVersionCode: activeServerRecord.android_version_code || null,
                rawData: activeServerRecord,
                count: serverIds.length
            };
            
        } catch (error) {
            console.error('Error getting active servers:', error);
            return {
                success: false,
                error: error.message,
                serverIds: [],
                iosVersionCode: null,
                androidVersionCode: null
            };
        }
    }
    
    // Update active servers list
    static async updateActiveServers(serverIds) {
        try {
            // Convert array to string format like "[1,2,3]"
            const serverIdList = `[${serverIds.join(',')}]`;
            
            const query = `
                INSERT INTO active_servers (id, server_id_list, updated_at) 
                VALUES (1, ?, NOW()) 
                ON DUPLICATE KEY UPDATE 
                server_id_list = VALUES(server_id_list), 
                updated_at = NOW()
            `;
            
            const [result] = await db.getPool().execute(query, [serverIdList]);
            
            return {
                success: true,
                message: 'Active servers updated successfully',
                affectedRows: result.affectedRows,
                serverIds: serverIds
            };
            
        } catch (error) {
            console.error('Error updating active servers:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ActiveServers;
