const mysql = require('mysql');
require('dotenv').config(); // Load environment variables from .env file

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create the userGroups table
  const createUserGroupsTable = `CREATE TABLE IF NOT EXISTS userGroups (
    groupId INT AUTO_INCREMENT PRIMARY KEY,
    secret VARCHAR(255)
  )`;
  
  connection.query(createUserGroupsTable, (err, result) => {
    if (err) {
      console.error('Error creating userGroups table:', err);
      return;
    }
    console.log('Created userGroups table');
  });
  
  // Create the users table
  const createUsersTable = `CREATE TABLE IF NOT EXISTS users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(512),
    groupId INT,
    FOREIGN KEY (groupId) REFERENCES userGroups(groupId)
  )`;

  connection.query(createUsersTable, (err, result) => {
    if (err) {
      console.error('Error creating users table:', err);
      return;
    }
    console.log('Created users table');
  });
  
  // Create the refreshTokens table
  const createRefreshTokensTable = `CREATE TABLE IF NOT EXISTS refreshTokens (
    uuid VARCHAR(255) PRIMARY KEY,
    expirationDate DATETIME UNIQUE,
    userId INT,
    FOREIGN KEY (userId) REFERENCES users(userId)
  )`;

  connection.query(createRefreshTokensTable, (err, result) => {
  if (err) {
      console.error('Error creating refreshTokens table:', err);
      return;
    }
  console.log('Created refreshTokens table');
  });
});
