const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

function generateTokenSecret() {
  return crypto.randomBytes(64).toString('hex');
}

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

const generateAccessToken = (username, role_id, access_token_secret) => {
  return jwt.sign({ username, role_id }, access_token_secret, { expiresIn: '5m' });
};

const generateRefreshToken = (username, role_id, refresh_token_secret) => {
  return jwt.sign({ username, role_id }, refresh_token_secret, { expiresIn: "7d" });
};

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    res.status(401).end();
    return;
  }
  
  const findUserQuery = `SELECT users.password, roles.role_name, roles.role_id, roles.secret 
                       FROM users 
                       INNER JOIN roles ON users.role_id = roles.role_id 
                       WHERE username = ? OR email = ?`;
  connection.query(findUserQuery, [username, username], async (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).end();
      return;
    }

    if (result.length === 0) {
      res.status(401).end();
      return;
    }

    const hashedPassword = result[0].password;

    try {
      if (await argon2.verify(hashedPassword, password)) {
        const role_id = result[0].role_id;
        const access_secret = result[0].secret; // maybe use different for access/ refresh
        const refresh_secret = result[0].secret;
        
        const accessToken = generateAccessToken(username, role_id, access_secret);
        const refreshToken = generateRefreshToken(username, role_id, refresh_secret);

        res.cookie('accessToken', accessToken, {  
          httpOnly: true,
          secure: false, // set to false due to testing on localhost
          sameSite: 'strict',
          expires: new Date(Date.now() + 5 * 60 * 1000) // expires in 5 minutes
        });
      
        res.cookie('refreshToken', refreshToken, {  
          httpOnly: true,
          secure: false, // set to false due to testing on localhost
          sameSite: 'strict',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // expires in 30 days
        });

        res.send('Logged in.').end();
      } else {
        res.status(401).end();
      }
    } catch (err) {
      console.log(err);
      res.status(500).end();
    }
  });
};

const welcomeHandler = (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.decode(token);
    const role_id = data.role_id;

    const findRoleQuery = `SELECT secret FROM roles WHERE role_id = ?`;
    connection.query(findRoleQuery, [role_id], (err, result) => {
      if (err || result.length === 0) {
        return res.sendStatus(403);
      }
      const secret = result[0].secret;
      try {
        jwt.verify(token, secret);
        return res.json({ user: { username: data.username, role_id: role_id } });
      } catch (err) {
        return res.sendStatus(403);
      }
    });
  } catch (err) {
    return res.sendStatus(403);
  }
};

const refreshHandler = (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.sendStatus(403);
  }

  try {
    const data = jwt.decode(token);
    req.username = data.username;
    req.role_id = data.role_id;

    const findRoleQuery = `SELECT secret FROM roles WHERE role_id = ?`;
    connection.query(findRoleQuery, [req.role_id], (err, result) => {
      if (err || result.length === 0) {
        return res.sendStatus(403);
      }

      const secret = result[0].secret;

      try {
        jwt.verify(token, secret);

        // Generate a new access token using the retrieved secret
        const accessToken = generateAccessToken(req.username, req.role_id, secret);

        // Set the access token cookie with the new token
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: false, // set to false due to testing on localhost
          sameSite: 'strict',
          expires: new Date(Date.now() + 5 * 60 * 1000), // expires in 5 minutes
        });
        
        // Generate a new refresh token using the retrieved secret
        const refreshToken = generateRefreshToken(req.username, req.role_id, secret);

        // Set the access token cookie with the new token
        res.cookie('refreshToken', refreshToken, {  
          httpOnly: true,
          secure: false, // set to false due to testing on localhost
          sameSite: 'strict',
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // expires in 30 days
        });
        
        // Send the new access token in the response
        //res.json({ accessToken }).end();
        res.send('Refreshed.').end();
      } catch (err) {
        return res.sendStatus(403);
      }
    });
  } catch (err) {
    return res.sendStatus(403);
  }
};

const logoutHandler = (req, res) => {
  const accessToken = req.cookies['accessToken'];
  const refreshToken = req.cookies['refreshToken'];

  if (!accessToken && !refreshToken) {
    res.status(401).end();
    return;
  }

  // Get user's role_id from access token
  const data = jwt.decode(accessToken);
  const role_id = data.role_id;

  // Generate new secret for user's role and update database
  const newSecret = generateTokenSecret();
  const updateRoleQuery = `UPDATE roles SET secret = ? WHERE role_id = ?`;
  connection.query(updateRoleQuery, [newSecret, role_id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).end();
      return;
    }

    // Clear cookies and send response
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.send('Logged out.').end();
  });
};

module.exports = {
  loginHandler,
  welcomeHandler,
  refreshHandler,
  logoutHandler
};
