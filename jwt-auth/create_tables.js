const mysql = require('mysql');
require('dotenv').config(); // Load environment variables from .env file

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
    
  // Create the roles table
  const createRolesTable = `CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(255),
    secret VARCHAR(255)
  )`;
  
  connection.query(createRolesTable, (err, result) => {
    if (err) throw err;
    console.log('Created roles table');
  });
  
  // Create the users table
  const createUsersTable = `CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(512),
    role_id INT,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
  )`;

  connection.query(createUsersTable, (err, result) => {
    if (err) throw err;
    console.log('Created users table');
  });
});

