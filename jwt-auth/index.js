const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cookieParser());

const authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.sendStatus(403);
  }
  try {
    const data = jwt.verify(token, "YOUR_SECRET_KEY");
    req.userId = data.id;
    req.userRole = data.role;
    return next();
  } catch (err) {
    return res.sendStatus(403);
  }
};

app.get("/", (req, res) => {
  res.json({ message: "Hello World 🇵🇹 🤘" });
});

app.get("/login", (req, res) => {
  const token = jwt.sign({ id: 7, role: "captain" }, "YOUR_SECRET_KEY");
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
  }).status(200).json({ message: "Logged in successfully 😊 👌" });
});

app.get("/protected", authorization, (req, res) => {
  res.json({ user: { id: req.userId, role: req.userRole } });
});

app.get("/logout", authorization, (req, res) => {
  res.clearCookie("access_token").status(200).json({ message: "Successfully logged out 😏 🍀" });
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

start(3332);