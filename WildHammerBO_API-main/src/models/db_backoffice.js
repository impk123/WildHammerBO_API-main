const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'backoffice',
      port: process.env.DB_PORT || 3306,
    });

    console.log('======================================')
    console.log('🔗 Database Config backoffice:');
    console.log('  Host:', process.env.DB_HOST);
    console.log('  Port:', process.env.DB_PORT);
    console.log('  Database:', process.env.DB_NAME);
    console.log('  User:', process.env.DB_USER);
    console.log('  Password:', process.env.DB_PASSWORD);
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
