const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST_WEBGAME || 'localhost',
      user: process.env.DB_USER_WEBGAME || 'appuser',
      password: process.env.DB_PASSWORD_WEBGAME || '',
      database: process.env.DB_NAME_WEBGAME || 'lyz_webgame',
      port: process.env.DB_PORT_WEBGAME || 3306,
    });

    console.log('======================================')
    console.log('🔗 Database Config webgame:');
    console.log('  Host:', process.env.DB_HOST_WEBGAME);
    console.log('  Port:', process.env.DB_PORT_WEBGAME);
    console.log('  Database:', process.env.DB_NAME_WEBGAME);
    console.log('  User:', process.env.DB_USER_WEBGAME);
    console.log('  Password:', process.env.DB_PASSWORD_WEBGAME);
    console.log('======================================')
  }

  getPool() {
    return this.pool;
  }

  async execute(query, params = []) {
    return await this.pool.execute(query, params);
  }
}

const db = new Database();
module.exports = db;
