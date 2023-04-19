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
    
  // Create the users table
  const createUsersTable = `CREATE TABLE IF NOT EXISTS users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(512)
  )`;

  connection.query(createUsersTable, (err, result) => {
    if (err) {
      console.error('Error creating users table:', err);
      return;
    }
    console.log('Created users table');
  });
  
  // Create the sessions table
  const createSessionsTable = `CREATE TABLE IF NOT EXISTS sessions (
    sessionId VARCHAR(255) PRIMARY KEY,
    expirationDate DATETIME UNIQUE,
    userId INT,
    FOREIGN KEY (userId) REFERENCES users(userId)
  )`;

  connection.query(createSessionsTable, (err, result) => {
  if (err) {
      console.error('Error creating sessions table:', err);
      return;
    }
  console.log('Created sessions table');
  });
});
