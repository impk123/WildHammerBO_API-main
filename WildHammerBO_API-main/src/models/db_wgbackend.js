const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST_BACKEND || 'localhost',
      user: process.env.DB_USER_BACKEND || 'root',
      password: process.env.DB_PASSWORD_BACKEND || '',
      database: process.env.DB_NAME_BACKEND || 'lyz_wgbackend',
      port: process.env.DB_PORT_BACKEND || 3306,
    });

    console.log('======================================')
    console.log('🔗 Database Config wgbackend:');
    console.log('  Host:', process.env.DB_HOST_BACKEND);
    console.log('  Port:', process.env.DB_PORT_BACKEND);
    console.log('  Database:', process.env.DB_NAME_BACKEND);
    console.log('  User:', process.env.DB_USER_BACKEND);
    console.log('  Password:', process.env.DB_PASSWORD_BACKEND);
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
