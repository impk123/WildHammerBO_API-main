

const db_backoffice = require('./db_backoffice');

async function findUser(email) {
	const pool = db.getPool();
	const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
	return rows[0] || null;
}

module.exports = { findUser };
