const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();
app.use(cookieParser());
app.use(session({
  secret: 'YOUR_SESSION_SECRET_KEY',
  resave: false,
  saveUninitialized: true,
}));

const authorization = (req, res, next) => {
  if (!req.session.userId) {
    return res.sendStatus(403);
  }
  req.userRole = req.session.userRole;
  return next();
};

app.get("/", (req, res) => {
  res.json({ message: "Hello World 🇵🇹 🤘" });
});

app.get("/login", (req, res) => {
  req.session.userId = 7;
  req.session.userRole = "captain";
  res.status(200).json({ message: "Logged in successfully 😊 👌" });
});

app.get("/protected", authorization, (req, res) => {
  res.json({ user: { id: req.session.userId, role: req.userRole } });
});

app.get("/logout", authorization, (req, res) => {
  req.session.destroy();
  res.status(200).json({ message: "Successfully logged out 😏 🍀" });
});

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

start(3333);