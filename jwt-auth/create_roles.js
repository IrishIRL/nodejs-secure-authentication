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

  const newRoles = [
    { role_name: 'user', secret: 'super_secret_1' },
    { role_name: 'admin', secret: 'super_secret_2' }
  ];

  connection.query('INSERT INTO roles (role_name, secret) VALUES ?', [newRoles.map(r => [r.role_name, r.secret])], (err, result) => {
    if (err) throw err;
    console.log(`${result.affectedRows} new roles inserted`);
    connection.end();
  });
});
