const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
require('dotenv').config();
app.use(cookieParser());

// Middleware to authenticate access tokens
const authenticateAccessToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log(authHeader);
  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Middleware to authenticate refresh tokens
const authenticateRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  console.log(refreshToken);
  if (!refreshToken) {
    return res.sendStatus(401);
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Endpoint to generate access and refresh tokens
//app.post("/login", (req, res) => {
  //const { username, password } = req.body;
app.get("/login", (req, res) => {
  const { username, password } = req.query;

  // Check if username and password are valid (for demo purposes, we'll just hard-code them)
  if (username !== "myusername" || password !== "mypassword") {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  // Generate access token and refresh token
  const accessToken = jwt.sign({ id: 7, role: "captain" }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: 7, role: "captain" }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

  // Set access token as HTTP-only cookie
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  // Set refresh token as HTTP-only cookie
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.status(200).json({ message: "Logged in successfully." });
});

// Endpoint to refresh access token
app.post('/refresh', authenticateRefreshToken, (req, res) => {
  const accessToken = jwt.sign({ username: req.user.username, password: req.user.password }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
  res.json({ accessToken: accessToken });
});

// Protected endpoint
app.post('/protected', authenticateAccessToken, (req, res) => {
  res.json({ message: 'Hello World!' });
});

// Endpoint to revoke refresh token
app.post('/logout', authenticateRefreshToken, (req, res) => {
  res.clearCookie('refreshToken');
  res.sendStatus(204);
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