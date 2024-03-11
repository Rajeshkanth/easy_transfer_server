require("dotenv").config();
const { databaseConnection } = require("./db.js");
const express = require("express");
const app = express();
const cors = require("cors");
const {
  renderPaymentAlertsBySocket,
  sendAmountBySocket,
  joinSuccessPage,
  confirmBySocket,
  cancelBySocket,
  getTransactionsBySocket,
} = require("./controllers/socket_config/transaction.js");
const {
  signUpBySocket,
  loginBySocket,
  alertPageLoginBySocket,
} = require("./controllers/socket_config/auth.js");
const {
  checkUserNameBySocket,
  updateUserProfileBySocket,
} = require("./controllers/socket_config/user.js");
const {
  saveNewBeneficiaryBySocket,
  getSavedAccountsBySocket,
} = require("./controllers/socket_config/savedAccounts.js");

const {
  configuration,
  paid,
  canceled,
} = require("./controllers/polling_config/transactions.js");

const port = process.env.PORT;
const { io, server } = require("./socket.js");

app.set("view engine", "ejs");
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.static(__dirname + "/views"));

io.on("connection", (socket) => {
  io.emit("connection_type", {
    type: "socket",
  });

  socket.on("signUp", signUpBySocket);

  socket.on("login", loginBySocket);

  socket.on("alertPageLogin", alertPageLoginBySocket);

  socket.on("paymentPage", (data) => sendAmountBySocket(data, socket));

  socket.on("successPage", (data) => joinSuccessPage(data, socket));

  socket.on("confirmed", (data) => confirmBySocket(data, socket));

  socket.on("canceled", (data) => cancelBySocket(data, socket));

  socket.on("checkUserName", (data) => checkUserNameBySocket(data, socket));

  socket.on("updateProfile", (data) => updateUserProfileBySocket(data, socket));

  socket.on("getSavedAccounts", (data) =>
    getSavedAccountsBySocket(data, socket)
  );

  socket.on("getTransactionDetails", (data) =>
    getTransactionsBySocket(data, socket)
  );

  socket.on("saveNewBeneficiary", (data) =>
    saveNewBeneficiaryBySocket(data, socket)
  );
});

app.get("/", configuration);
app.get("/paid", paid);
app.get("/canceled", canceled);
app.get("/homePage", renderPaymentAlertsBySocket);

databaseConnection();
server.listen(port);
