const uuid = require('uuid')
const mysql = require('mysql');
const argon2 = require('argon2');
require('dotenv').config(); // Load environment variables from .env file

class Session {
    constructor(username, expiresAt) {
        this.username = username
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

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    res.status(401).end();
    return;
  }
  
  const findUserQuery = `SELECT users.password, roles.role_name, roles.role_id 
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
        // generate a random UUID as the session token
        const sessionToken = uuid.v4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const session = new Session(username, expiresAt);
        sessions[sessionToken] = session;

        res.cookie('sessionToken', sessionToken, sessionCookieSettings);
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
    res.send(`Welcome  ${userSession.username}!`).end();
}

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
    const newSessionToken = uuid.v4();

    // renew the expiry time
    const now = new Date();
    const expiresAt = new Date(+now + 120 * 1000);
    const session = new Session(userSession.username, expiresAt);

    // add the new session to our map, and delete the old session
    sessions[newSessionToken] = session;
    delete sessions[sessionToken];

    res.cookie('sessionToken', newSessionToken, sessionCookieSettings);
    res.send('Refreshed.').end();
}

const logoutHandler = (req, res) => {
    if (!req.cookies) {
        res.status(401).end()
        return
    }

    const sessionToken = req.cookies['sessionToken']
    if (!sessionToken) {
        res.status(401).end()
        return
    }

    delete sessions[sessionToken]

    res.cookie('sessionToken', '', { expires: new Date(0) })
    res.send('Logged out.').end()
}

module.exports = {
    loginHandler,
    welcomeHandler,
    refreshHandler,
    logoutHandler
}
