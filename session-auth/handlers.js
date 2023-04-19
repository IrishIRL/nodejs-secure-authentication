const mysql = require('mysql');
const crypto = require('crypto');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

function generateRandomUUID() {
  return crypto.randomUUID();
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
        const uuid = generateRandomUUID();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        
        createSession(uuid, result[0].userId, expiresAt, (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).send('Internal server error').end();
          }

          res.cookie('sessionToken', uuid, sessionCookieSettings);
          res.send('Logged in.').end();
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
/*
const welcomeHandler = (req, res) => {
    // if this request doesn't have any cookies, that means it isn't
    // authenticated. Return an error code.
    if (!req.cookies) {
        res.status(401).end();
        return
    }

    // We can obtain the session token from the requests cookies, which come with every
    // request
    const sessionToken = req.cookies['sessionToken'];
    if (!sessionToken) {
        // If the cookie is not set, return an unauthorized status
        res.status(401).end();
        return
    }

    // We then get the session of the user from our session map
    // that we set in the loginHandler
    userSession = sessions[sessionToken];
    if (!userSession) {
        // If the session token is not present in session map, return an unauthorized error
        res.status(401).end();
        return
    }
    // if the session has expired, return an unauthorized error, and delete the 
    // session from our map
    if (userSession.isExpired()) {
        delete sessions[sessionToken];
        res.status(401).end();
        return
    }

    // If all checks have passed, we can consider the user authenticated and
    // send a welcome message
    res.send(`Welcome  ${userSession.userId}!`).end();
}*/

const welcomeHandler = (req, res) => {
  const sessionToken = req.cookies['sessionToken'];
  
  if (!sessionToken) {
    return res.status(401).send('Session cookie not found').end();
  }

  getSession(sessionToken, (err, session) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Internal server error').end();
    }

    if (!session) {
      return res.status(401).send('Session not found').end();
    }

    if (session.isExpired()) {
      deleteSession(sessionToken, (err) => {
        if (err) {
          console.log(err);
        }
      });
      return res.status(401).send('Session expired').end();
    }

    return res.status(200).send(`Welcome ${session.userId}!`).end();
  });
};
/*
const refreshHandler = (req, res) => {
    // (BEGIN) The code from this point is the same as the first part of the welcomeHandler
    if (!req.cookies) {
        res.status(401).end();
        return
    }

    const sessionToken = req.cookies['sessionToken'];
    if (!sessionToken) {
        res.status(401).end();
        return
    }

    userSession = sessions[sessionToken];
    if (!userSession) {
        res.status(401).end();
        return
    }
    if (userSession.isExpired()) {
        delete sessions[sessionToken];
        res.status(401).end();
        return
    }
    // (END) The code until this point is the same as the first part of the welcomeHandler

    // create a new session token
    const newUUID = generateRandomUUID();

    // renew the expiry time
    const now = new Date();
    const expiresAt = new Date(+now + 120 * 1000);
    const session = new Session(userSession.userId, expiresAt);

    // add the new session to our map, and delete the old session
    sessions[newUUID] = session;
    delete sessions[sessionToken];

    res.cookie('sessionToken', newUUID, sessionCookieSettings);
    res.send('Refreshed.').end();
}*/

const refreshHandler = (req, res) => {
  const sessionToken = req.cookies['sessionToken'];
  if (!sessionToken) {
    return res.status(401).send('Session cookie not found').end();
  }

  getSession(sessionToken, (err, session) => {
    if (err) {
      return res.status(500).send('Internal server error').end();
    }

    if (!session) {
      return res.status(401).send('Session not found').end();
    }

    if (session.isExpired()) {
      deleteSession(sessionToken, (err) => {
        if (err) {
          return res.status(500).send('Internal server error').end();
        }
        return res.status(401).send('Session expired').end();
      });
      return res.status(401).end();
    }

    const newUUID = generateRandomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    createSession(newUUID, session.userId, expiresAt, (err) => {
      if (err) {
        return res.status(500).send('Internal server error').end();
      }
      deleteSession(sessionToken, (err) => {
        if (err) {
          return res.status(500).send('Internal server error').end();
        }
        res.cookie('sessionToken', newUUID, sessionCookieSettings);
        res.send('Refreshed.').end();
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

