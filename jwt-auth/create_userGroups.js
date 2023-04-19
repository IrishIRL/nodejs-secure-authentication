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

  const newUserGroups = [
    { secret: generateTokenSecret() },
    { secret: generateTokenSecret() }
  ];

  const values = newUserGroups.map(r => [r.secret]);
  const sql = 'INSERT INTO userGroups (secret) VALUES ?';

  connection.query(sql, [values], (err, result) => {
    if (err) throw err;
    console.log(`${result.affectedRows} new userGroups inserted`);
    connection.release();
  });
});
