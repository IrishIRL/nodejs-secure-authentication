const mysql = require('mysql');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

pool.getConnection(async (err, connection) => {
  if (err) throw err;
  console.log('Connected to MySQL database');

  const newUsers = [
    { username: 'user1', email: 'user1@email.ee', password: 'password1', groupId: 1 },
    { username: 'user2', email: 'user2@email.ee', password: 'password2', groupId: 1 },
    { username: 'user3', email: 'user3@email.ee', password: 'password3', groupId: 2 },
    { username: 'user4', email: 'user4@email.ee', password: 'password4', groupId: 1 },
    { username: 'user5', email: 'user5@email.ee', password: 'password5', groupId: 2 }
  ];

  for (let user of newUsers) {
    try {
      const hashedPassword = await argon2.hash(user.password);
      const values = [[user.username, user.email, hashedPassword, user.groupId]];
      connection.query('INSERT INTO users (username, email, password, groupId) VALUES ?', [values], (err, result) => {
        if (err) throw err;
        console.log(`User ${user.username} inserted`);
      });
    } catch (err) {
      console.error(err);
    }
  }

  connection.release();
});
