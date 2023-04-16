const jwt = require('jsonwebtoken');

const users = {
  'user1': 'password1',
  'user2': 'password2'
};

const ACCESS_TOKEN_SECRET = 'your_access_token_secret';
const REFRESH_TOKEN_SECRET = 'your_refresh_token_secret';

const generateAccessToken = (username) => {
  return jwt.sign({ username }, ACCESS_TOKEN_SECRET, { expiresIn: '5m' });
};

const generateRefreshToken = (username) => {
  return jwt.sign({ username }, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    res.status(401).end();
    return;
  }

  const expectedPassword = users[username];

  if (!expectedPassword || expectedPassword !== password) {
    res.status(401).end();
    return;
  }

  const accessToken = generateAccessToken(username);
  const refreshToken = generateRefreshToken(username);

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
};

const welcomeHandler = (req, res) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.username = data.username;
  } catch (err) {
    return res.sendStatus(403);
  }
  return res.json({ user: { username: req.username } });
};

const refreshHandler = (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.verify(token, REFRESH_TOKEN_SECRET);
    req.username = data.username;
  } catch (err) {
    return res.sendStatus(403);
  }

  res.clearCookie('accessToken');
  
  const accessToken = generateAccessToken(req.username);

  res.cookie('accessToken', accessToken, {  
    httpOnly: true,
    secure: false, // set to false due to testing on localhost
    sameSite: 'strict',
    expires: new Date(Date.now() + 5 * 60 * 1000) // expires in 5 minutes
  });
  
  res.json({ accessToken }).end();
};

const logoutHandler = (req, res) => {
  const accessToken = req.cookies['accessToken'];
  const refreshToken = req.cookies['refreshToken'];

  if (!accessToken && !refreshToken) {
    res.status(401).end();
    return;
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.send('Logged out.').end();
};

module.exports = {
  loginHandler,
  welcomeHandler,
  refreshHandler,
  logoutHandler
};
