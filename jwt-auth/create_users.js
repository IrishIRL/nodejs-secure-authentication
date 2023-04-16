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

  const newUsers = [
    { username: 'user1', email: 'user1@email.ee', password: 'password1', role_id: 1 },
    { username: 'user2', email: 'user2@email.ee', password: 'password2', role_id: 1 },
    { username: 'user3', email: 'user3@email.ee', password: 'password3', role_id: 2 },
    { username: 'user4', email: 'user4@email.ee', password: 'password4', role_id: 1 },
    { username: 'user5', email: 'user5@email.ee', password: 'password5', role_id: 2 }
  ];

  connection.query('INSERT INTO users (username, email, password, role_id) VALUES ?', [newUsers.map(u => [u.username, u.email, u.password, u.role_id])], (err, result) => {
    if (err) throw err;
    console.log(`${result.affectedRows} new users inserted`);
    connection.end();
  });
});
