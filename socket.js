const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

module.exports = { io, server, app };
