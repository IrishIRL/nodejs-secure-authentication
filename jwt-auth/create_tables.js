const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'mydb'
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
    console.log('Created users table');
  });
  
  // Create the users table
  const createUsersTable = `CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role_id INT,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
  )`;

  connection.query(createUsersTable, (err, result) => {
    if (err) throw err;
    console.log('Created roles table');
  });
});

