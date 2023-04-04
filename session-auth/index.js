const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();
app.use(cookieParser());
app.use(session({
  secret: "YOUR_SECRET_KEY",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false, // set to false due to testing on localhost
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

const authorization = (req, res, next) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;

  if (!userId || !userRole) {
    return res.sendStatus(403);
  }
  return next();
};

app.get("/", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.get("/login", (req, res) => {
  req.session.userId = 7;
  req.session.userRole = "captain";
  return res.status(200).json({ message: "Logged in successfully." });
});

app.get("/protected", authorization, (req, res) => {
  const userId = req.session.userId;
  const userRole = req.session.userRole;
  return res.json({ user: { id: userId, role: userRole } });
});

app.get("/logout", authorization, (req, res) => {
  req.session.destroy();
  return res.status(200).json({ message: "Successfully logged out." });
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