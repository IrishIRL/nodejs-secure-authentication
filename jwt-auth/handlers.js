const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

function generateGroupSecret() {
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

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

async function findUserByUsername(username, callback) {
  const findUserQuery = `SELECT users.userId, users.password, userGroups.groupId, userGroups.secret 
    FROM users 
    INNER JOIN userGroups ON users.groupId = userGroups.groupId 
    WHERE username = ? OR email = ?`; // search by email could be added
  connection.query(findUserQuery, [username, username], async (err, result) => {
    if (err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, result);
    }
  });
}

function insertRefreshToken(uuid, expirationDate, userId, callback) {
  const insertTokenQuery = "INSERT INTO refreshTokens (uuid, expirationDate, userId) VALUES (?, ?, ?)";
  connection.query(insertTokenQuery, [uuid, expirationDate, userId], (err, result) => {
    if (err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, result);
    }
  });
}

function deleteRefreshToken(token, callback) {
  const deleteTokenQuery = `DELETE FROM refreshTokens WHERE uuid = ?`;
  connection.query(deleteTokenQuery, [token], (err, result) => {
    if (err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, result);
    }
  });
}

const cookieSettings = {
  httpOnly: true,
  secure: false, // set to false due to testing on localhost
  sameSite: 'strict'
};

const getAccessTokenCookieSettings = () => {
  return {
    ...cookieSettings,
    expires: new Date(Date.now() + 5 * 60 * 1000) // expires in 5 minutes
  };
};

const getRefreshTokenCookieSettings = () => {
  return {
    ...cookieSettings,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // expires in 30 days
  };
};

const generateAccessToken = (username, groupId, accessTokenSecret) => {
  return jwt.sign({ username, groupId }, accessTokenSecret, { expiresIn: '5m' });
};

const loginHandler = async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    res.status(401).end();
    return;
  }
  
  try {
    const result = await new Promise((resolve, reject) => {
      findUserByUsername(username, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    if (result.length === 0) {
      res.status(401).end();
      return;
    }

    const hashedPassword = result[0].password;

    if (await argon2.verify(hashedPassword, password)) {
      const userId = result[0].userId;
      const groupId = result[0].groupId;
      const accessTokenSecret = result[0].secret + hashedPassword;        
      const uuid = generateRandomUUID();
      const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      insertRefreshToken(uuid, expirationDate, userId, (err, result) => {
        if (err) {
          res.status(500).end();
        } else {
          const accessTokenCookieSettings = getAccessTokenCookieSettings();
          const refreshTokenCookieSettings = getRefreshTokenCookieSettings();
      
          const accessToken = generateAccessToken(username, groupId, accessTokenSecret); 

          res.cookie('accessToken', accessToken, accessTokenCookieSettings);
          res.cookie('refreshToken', uuid, refreshTokenCookieSettings);
      
          res.send('Logged in.').end();
        }
      });
    } else {
      res.status(401).end();
    }
  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
};

const welcomeHandler = (req, res) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.decode(accessToken);
    const username = data.username;
    const groupId = data.groupId;
    
    findUserByUsername(username, (err, result) => {
      if (err) {
        res.status(500).end();
      }
    
      const hashedPassword = result[0].password;
      const secret = result[0].secret + hashedPassword;
      
      jwt.verify(accessToken, secret);
      return res.json({ user: { username: data.username, groupId: groupId } });
    });
  } catch (err) {
    return res.sendStatus(403);
  }
};

const refreshHandler = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.sendStatus(403);
  }

  try {
    const findUserInfoQuery = `SELECT users.userId, users.username, users.password, userGroups.groupId, userGroups.secret, refreshTokens.expirationDate
    FROM refreshTokens
    INNER JOIN users ON refreshTokens.userId = users.userId
    INNER JOIN userGroups ON users.groupId = userGroups.groupId
    WHERE refreshTokens.uuid = ?`;
    connection.query(findUserInfoQuery, [refreshToken], (err, result) => {
      if (err || result.length === 0) {
        return res.sendStatus(403);
      }

      const userId = result[0].userId;
      var nowDate = new Date();
      var expirationDateFromDatabase = result[0].expirationDate;
     
      // Verify that UUID is not yet expired
      if (nowDate.getTime() > expirationDateFromDatabase.getTime()) {
        // If expired, we can safely remove UUID from DB
        deleteRefreshToken(refreshToken, (err, result) => {
          if (err) {
            res.status(500).end();
          }
        });
        return res.sendStatus(403);
      }

      // Generate a new access token using retreived secret
      const hashedPassword = result[0].password;
      const secret = result[0].secret + hashedPassword;      
      const username = result[0].username;
      const groupId = result[0].groupId;
      const accessToken = generateAccessToken(username, groupId, secret);

      const uuid = generateRandomUUID();
      const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Delete previous refresh token
      deleteRefreshToken(refreshToken, (err, result) => {
        if (err) {
          res.status(500).end();
        }
      });

      // Insert new refresh token
      insertRefreshToken(uuid, expirationDate, userId, (err, result) => {
        if (err) {
          res.status(500).end();
        }
      });
        
      const accessTokenCookieSettings = getAccessTokenCookieSettings();
      const refreshTokenCookieSettings = getRefreshTokenCookieSettings();
      res.cookie('accessToken', accessToken, accessTokenCookieSettings);
      res.cookie('refreshToken', uuid, refreshTokenCookieSettings);
        
      res.send('Refreshed.').end();
    });
  } catch (err) {
    console.log(err);
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
  
  if (accessToken) {
    // Get user's groupId from access token
    const data = jwt.decode(accessToken);
    const groupId = data.groupId;
    
    // Generate new secret for user's group and update database
    const newGroupSecret = generateGroupSecret();
    const updateGroupQuery = `UPDATE userGroups SET secret = ? WHERE groupId = ?`;
    connection.query(updateGroupQuery, [newGroupSecret, groupId], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).end();
        return;
      }
    });
    
    res.clearCookie('accessToken');
  }
  
  if (refreshToken) {
    // Delete previous refresh token
    deleteRefreshToken(refreshToken, (err, result) => {
      if (err) {
        res.status(500).end();
      }
    });
    
    res.clearCookie('refreshToken');
  }

  res.send('Logged out.').end();
};

module.exports = {
  loginHandler,
  welcomeHandler,
  refreshHandler,
  logoutHandler
};