const mysql = require('mysql');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables from .env file

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

function generateTokenSecret() {
  return crypto.randomBytes(64).toString('hex');
}

pool.getConnection((err, connection) => {
  if (err) throw err;
  console.log('Connected to MySQL database');

  const newRoles = [
    { role_name: 'user', secret: generateTokenSecret() },
    { role_name: 'admin', secret: generateTokenSecret() }
  ];

  const values = newRoles.map(r => [r.role_name, r.secret]);
  const sql = 'INSERT INTO roles (role_name, secret) VALUES ?';

  connection.query(sql, [values], (err, result) => {
    if (err) throw err;
    console.log(`${result.affectedRows} new roles inserted`);
    connection.release();
  });
});
