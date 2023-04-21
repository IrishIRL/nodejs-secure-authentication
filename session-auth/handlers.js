const mysql = require('mysql');
const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

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

class Session {
    constructor(userId, expiresAt) {
        this.userId = userId
        this.expiresAt = expiresAt
    }

    isExpired() {
        this.expiresAt < (new Date())
    }
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

const sessionCookieSettings = {
  ...cookieSettings,
  expires: new Date(Date.now() + 5 * 60 * 1000) // expires in 5 minutes
};

const sessions = {}

const uuidExists = (uuid, callback) => {
  const query = 'SELECT sessionId FROM sessions WHERE sessionId = ? LIMIT 1';
  connection.query(query, [uuid], (err, results) => {
    if (err) {
      console.error('Error checking if UUID exists:', err);
      return callback(err, null);
    }
    callback(null, results.length > 0);
  });
};

const createSession = (sessionId, userId, expiresAt, callback) => {
  const insertQuery = `
    INSERT INTO sessions (sessionId, expirationDate, userId)
    VALUES (?, ?, ?)
  `;
  connection.query(insertQuery, [sessionId, expiresAt, userId], callback);
};

const getSession = (sessionId, callback) => {
  const selectQuery = `
    SELECT *
    FROM sessions
    WHERE sessionId = ?
  `;
  connection.query(selectQuery, [sessionId], (err, result) => {
    if (err) {
      callback(err);
      return;
    }

    if (result.length === 0) {
      callback(null, null);
      return;
    }

    const session = new Session(result[0].userId, result[0].expirationDate);
    callback(null, session);
  });
};

const deleteSession = (sessionId, callback) => {
  const deleteQuery = `
    DELETE FROM sessions
    WHERE sessionId = ?
  `;
  connection.query(deleteQuery, [sessionId], callback);
};

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(401).end();
  }
  
  const findUserQuery = `SELECT users.userId, users.password
                       FROM users
                       WHERE username = ? OR email = ?`;
  connection.query(findUserQuery, [username, username], async (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Internal server error').end();
    }

    if (result.length === 0) {
      return res.status(401).end();
    }

    const hashedPassword = result[0].password;

    try {
      if (await argon2.verify(hashedPassword, password)) {
        generateRandomUUID((err, uuid) => {
          if (err) {
            return callback({status: 500, message: 'Internal server error'});
          }

          const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        
          createSession(uuid, result[0].userId, expiresAt, (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).send('Internal server error').end();
            }

            res.cookie('sessionToken', uuid, sessionCookieSettings);
            res.send('Logged in.').end();
          });
        });
      } else {
        return res.status(401).end();
      }
    } catch (err) {
      console.log(err);
      return res.status(500).send('Internal server error').end();
    }
  });
};

const welcomeHandler = (req, res) => {
  // Whenever the site authenticates the user, it also regenerates 
  // and resends the session cookie.
  refreshHandler(req, (err, newUUID, userId) => {
    if (err) {
      return res.status(err.status).send(err.message).end();
    }
    res.cookie('sessionToken', newUUID, sessionCookieSettings);
    return res.status(200).send(`Welcome ${userId}!`).end();
  });
};

const refreshHandler = (req, callback) => {
  const sessionToken = req.cookies['sessionToken'];
  if (!sessionToken) {
    return callback({status: 401, message: 'Session cookie not found'});
  }

  getSession(sessionToken, (err, session) => {
    if (err) {
      return callback({status: 500, message: 'Internal server error'});
    }

    if (!session) {
      return callback({status: 401, message: 'Session not found'});
    }

    if (session.isExpired()) {
      deleteSession(sessionToken, (err) => {
        if (err) {
          return callback({status: 500, message: 'Internal server error'});
        }
        return callback({status: 401, message: 'Session expired'});
      });
      return;
    }

    generateRandomUUID((err, newUUID) => {
      if (err) {
        return callback({status: 500, message: 'Internal server error'});
      }

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      createSession(newUUID, session.userId, expiresAt, (err) => {
        if (err) {
          return callback({status: 500, message: 'Internal server error'});
        }
        deleteSession(sessionToken, (err) => {
          if (err) {
            return callback({status: 500, message: 'Internal server error'});
          }
          callback(null, newUUID, session.userId);
        });
      });
    });
  });
};

const logoutHandler = (req, res) => {
    if (!req.cookies) {
        return res.status(401).end();
    }

    const sessionToken = req.cookies['sessionToken']
    if (!sessionToken) {
        return res.status(401).send('Session cookie not found').end();
    }
    
    deleteSession(sessionToken, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal server error').end();
      }
      res.cookie('sessionToken', '', { expires: new Date(0) });
      res.send('Logged out.').end();
    });
}

module.exports = {
    loginHandler,
    welcomeHandler,
    refreshHandler,
    logoutHandler
}
