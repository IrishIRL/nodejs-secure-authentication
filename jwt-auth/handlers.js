const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

function generateGroupSecret() {
  return crypto.randomBytes(64).toString('hex');
}

function generateRandomUUID(callback) {
  let uuid = crypto.randomUUID();
  let attempts = 0;
  
  function checkUUID() {
    uuidExists(uuid, (err, exists) => {
      if (err) {
        console.error('Error checking if UUID exists:', err);
        return callback(err, null);
      }
      if (exists) {
        // UUID already exists, generate a new one
        uuid = crypto.randomUUID();
        attempts++;
        if (attempts >= 10) {
          console.error('Error generating UUID: too many attempts');
          return callback(new Error('Unable to generate unique UUID'), null);
        }
        checkUUID();
      } else {
        // UUID doesn't exist, return it
        callback(null, uuid);
      }
    });
  }
  checkUUID();
}

const verifyAccessToken = (req, accessToken) => {
  return new Promise((resolve, reject) => {
    
    if (!accessToken) {
      reject({ statusCode: 401, message: 'Unauthorized' });
    } else {
      try {
        const data = jwt.decode(accessToken);
        const username = data.username;
        const groupId = data.groupId;
        findUserByUsername(username, (err, result) => {
          if (err) {
            reject({ statusCode: 500, message: 'Internal server error' });
          } else {
            const hashedPassword = result[0].password;
            const secret = result[0].secret + hashedPassword;
            jwt.verify(accessToken, secret, (err, decoded) => {
              if (err) {
                reject({ statusCode: 401, message: 'Unauthorized' });
              } else {
                resolve(decoded);
              }
            });
          }
        });
      } catch (err) {
        reject({ statusCode: 401, message: 'Unauthorized' });
      }
    }
  });
};

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

const uuidExists = (uuid, callback) => {
  const query = 'SELECT uuid FROM refreshTokens WHERE uuid = ? LIMIT 1';
  connection.query(query, [uuid], (err, results) => {
    if (err) {
      console.error('Error checking if UUID exists:', err);
      return callback(err, null);
    }
    callback(null, results.length > 0);
  });
};

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
  secure: true,
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
    return res.status(401).end();
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
      return res.status(401).end();
    }

    const hashedPassword = result[0].password;

    if (await argon2.verify(hashedPassword, password)) {
      const userId = result[0].userId;
      const groupId = result[0].groupId;
      const accessTokenSecret = result[0].secret + hashedPassword;        
      //const uuid = generateRandomUUID();
      
      generateRandomUUID((err, uuid) => {
          if (err) {
            return callback({status: 500, message: 'Internal server error'});
          }
          const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          insertRefreshToken(uuid, expirationDate, userId, (err, result) => {
            if (err) {
              return res.status(500).send('Internal server error').end();
            }
            const accessTokenCookieSettings = getAccessTokenCookieSettings();
            const refreshTokenCookieSettings = getRefreshTokenCookieSettings();
      
            const accessToken = generateAccessToken(username, groupId, accessTokenSecret);

            res.cookie('accessToken', accessToken, accessTokenCookieSettings);
            res.cookie('refreshToken', uuid, refreshTokenCookieSettings);
            return res.status(200).send('Logged in.').end();
        });
      });
    } else {
      return res.status(401).end();
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send('Internal server error').end();
  }
};

const welcomeHandler = async (req, res) => {
  const accessToken = req.cookies.accessToken;
  try {
    const decoded = await verifyAccessToken(req, accessToken);
    // code to handle successful authentication
    res.status(200).send(`Welcome ${decoded.username}!`);
  } catch (err) {
    res.status(err.statusCode).send(err.message);
  }
};

const refreshHandler = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.sendStatus(403).end();
  }

  try {
    const findUserInfoQuery = `SELECT users.userId, users.username, users.password, userGroups.groupId, userGroups.secret, refreshTokens.expirationDate
    FROM refreshTokens
    INNER JOIN users ON refreshTokens.userId = users.userId
    INNER JOIN userGroups ON users.groupId = userGroups.groupId
    WHERE refreshTokens.uuid = ?`;
    connection.query(findUserInfoQuery, [refreshToken], (err, result) => {
      if (err || result.length === 0) {
        return res.sendStatus(403).end();
      }

      const userId = result[0].userId;
      var nowDate = new Date();
      var expirationDateFromDatabase = result[0].expirationDate;
     
      // Verify that UUID is not yet expired
      if (nowDate.getTime() > expirationDateFromDatabase.getTime()) {
        // If expired, we can safely remove UUID from DB
        deleteRefreshToken(refreshToken, (err, result) => {
          if (err) {
            return res.status(500).send('Internal server error').end();
          }
        });
        return res.sendStatus(403).end();
      }

      // Generate a new access token using retreived secret
      const hashedPassword = result[0].password;
      const secret = result[0].secret + hashedPassword;      
      const username = result[0].username;
      const groupId = result[0].groupId;
      const accessToken = generateAccessToken(username, groupId, secret);

      //const uuid = generateRandomUUID();
      generateRandomUUID((err, uuid) => {
        if (err) {
          return callback({status: 500, message: 'Internal server error'});
        }
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Delete previous refresh token
        deleteRefreshToken(refreshToken, (err, result) => {
          if (err) {
            return res.status(500).send('Internal server error').end();
          }
        });

        // Insert new refresh token
        insertRefreshToken(uuid, expirationDate, userId, (err, result) => {
          if (err) {
            return res.status(500).send('Internal server error').end();
          }
        });
      
        const accessTokenCookieSettings = getAccessTokenCookieSettings();
        const refreshTokenCookieSettings = getRefreshTokenCookieSettings();
        res.cookie('accessToken', accessToken, accessTokenCookieSettings);
        res.cookie('refreshToken', uuid, refreshTokenCookieSettings);
        
        return res.status(200).send('Refreshed.').end();
      });
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(403);
  }
};

const logoutHandler = async (req, res) => {
  const accessToken = req.cookies['accessToken'];
  const refreshToken = req.cookies['refreshToken'];
  
  if (!accessToken && !refreshToken) {
    return res.status(401).end();
  }
  
  if (accessToken) {
    // Verify that the token is correct to mitigate possible DoS attacks.
    try {
      const decoded = await verifyAccessToken(req, accessToken);
      // Generate new secret for user's group and update database
      const newGroupSecret = generateGroupSecret();
      const updateGroupQuery = `UPDATE userGroups SET secret = ? WHERE groupId = ?`;
      connection.query(updateGroupQuery, [newGroupSecret, decoded.groupId], (err, result) => {
        if (err) {
          return res.status(500).send('Internal server error').end();
        }
      });
    } catch (err) {
      // We do not want to set status here, as it will be changed later.
      // res.status(err.statusCode).send(err.message);
    }
    res.clearCookie('accessToken');
  }
  
  if (refreshToken) {
    // Delete previous refresh token
    deleteRefreshToken(refreshToken, (err, result) => {
      if (err) {
        return res.status(500).send('Internal server error').end();
      }
    });
    
    // TODO: change accessToken secret?
    res.clearCookie('refreshToken');
  }

  return res.status(200).send('Logged out.').end();
};

module.exports = {
  loginHandler,
  welcomeHandler,
  refreshHandler,
  logoutHandler
};