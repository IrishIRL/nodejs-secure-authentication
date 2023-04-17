const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const { loginHandler, welcomeHandler, refreshHandler, logoutHandler } = require('./handlers');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

app.post('/login', loginHandler);
app.get('/welcome', welcomeHandler);
app.post('/refresh', refreshHandler);
app.get('/logout', logoutHandler);

const start = (port) => {
  try {
    app.listen(port, () => {
      console.log(`API up and running at: http://localhost:${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit();
  }
};

const portArgIndex = process.argv.indexOf('-p');
const port = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : 3332;

start(port);
