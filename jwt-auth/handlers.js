const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

function generateTokenSecret() {
  return crypto.randomBytes(64).toString('hex');
}

function generateRandomUUID() {
  return crypto.randomUUID();
}

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

const cookieSettings = {
  httpOnly: true,
  secure: false, // set to false due to testing on localhost
  sameSite: 'strict'
};

const accessTokenCookieSettings = {
  ...cookieSettings,
  expires: new Date(Date.now() + 5 * 60 * 1000) // expires in 5 minutes
};

const refreshTokenCookieSettings = {
  ...cookieSettings,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // expires in 30 days
};

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

const generateAccessToken = (username, role_id, access_token_secret) => {
  return jwt.sign({ username, role_id }, access_token_secret, { expiresIn: '5m' });
};

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    res.status(401).end();
    return;
  }
  
  const findUserQuery = `SELECT users.user_id, users.password, roles.role_name, roles.role_id, roles.secret 
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
        const user_id = result[0].user_id;
        const role_id = result[0].role_id;
        const access_secret = result[0].secret;
        const uuid = generateRandomUUID();
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // INSERT NEW TOKEN TO REFRESHTOKENS HERE
        var insertToken = "INSERT INTO refreshTokens (uuid, expiration_date, user_id) VALUES (?, ?, ?)";
        connection.query(insertToken, [uuid, expirationDate, user_id], (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).end();
            return;
          }
        });
        // INSERT NEW TOKEN TO REFRESHTOKENS HERE
    
        const accessToken = generateAccessToken(username, role_id, access_secret); 

        res.cookie('accessToken', accessToken, accessTokenCookieSettings);
        res.cookie('refreshToken', uuid, refreshTokenCookieSettings);
        
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
    return res.sendStatus(401);
  }

  try {
    const findUserInfoQuery = `SELECT users.user_id, users.username, roles.role_id, roles.secret
    FROM refreshTokens
    INNER JOIN users ON refreshTokens.user_id = users.user_id
    INNER JOIN roles ON users.role_id = roles.role_id
    WHERE refreshTokens.uuid = ?`;
    connection.query(findUserInfoQuery, [token], (err, result) => {
      if (err || result.length === 0) {
        return res.sendStatus(402);
      }

      try {
        const user = result[0];
        console.log(user);
        // Generate a new access token using retreived secret
        const accessToken = generateAccessToken(user.username, user.role_id, user.secret);
        
        const uuid = generateRandomUUID();
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // DELETE PREVIOUS REFRESH TOKEN
        const deleteQuery = `DELETE FROM refreshTokens WHERE uuid = ?`;
        connection.query(deleteQuery, [token], (err, result) => {
          if (err || result.affectedRows === 0) {
            console.log(err);
            return res.sendStatus(403);
          }
        });
        // DELETE PREVIOUS REFRESH TOKEN
        // INSERT NEW REFRESH TOKEN
        var insertToken = "INSERT INTO refreshTokens (uuid, expiration_date, user_id) VALUES (?, ?, ?)";
        connection.query(insertToken, [uuid, expirationDate, user.user_id], (err, result) => {
          if (err) {
            console.log(err);
            res.status(500).end();
            return;
          }
        });
        // INSERT NEW REFRESH TOKEN

        res.cookie('accessToken', accessToken, accessTokenCookieSettings);
        res.cookie('refreshToken', uuid, refreshTokenCookieSettings);
        
        res.send('Refreshed.').end();
      } catch (err) {
        console.log(err);
        return res.sendStatus(403);
      }
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(404);
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
  
   // DELETE PREVIOUS REFRESH TOKEN
   const deleteQuery = `DELETE FROM refreshTokens WHERE uuid = ?`;
   connection.query(deleteQuery, [refreshToken], (err, result) => {
      if (err || result.affectedRows === 0) {
        console.log(err);
        return res.sendStatus(403);
      }
    });
    // DELETE PREVIOUS REFRESH TOKEN
        
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