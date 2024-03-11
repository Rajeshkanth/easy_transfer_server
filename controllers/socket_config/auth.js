const asynchandler = require("express-async-handler");
const { findUserInSocket } = require("../../utils");
const { userModel } = require("../../model/userModel");
const { io } = require("../../socket");

const signUpBySocket = asynchandler(async (data) => {
  const { mobileNumber, password } = data;
  const existingUser = await findUserInSocket(io, { mobileNumber });

  const newUser = {
    mobileNumber: mobileNumber,
    password: password,
  };

  if (existingUser) {
    return io.emit("userRegisteredAlready");
  }
  userModel.insertMany([newUser]);

  io.emit("userRegistered", {
    mobileNumber: mobileNumber,
  });
});

const loginBySocket = asynchandler(async (data) => {
  const { mobileNumber, password } = data;
  const newUser = await findUserInSocket(io, { mobileNumber });

  if (!newUser) {
    return io.emit("newUser");
  }

  if (newUser.password !== password) {
    io.emit("loginFailed");
  } else {
  }

  io.emit("loginSuccess", {
    mobileNumber: mobileNumber,
  });
});

const alertPageLoginBySocket = asynchandler(async (data) => {
  const { mobileNumber, password } = data;
  const findUser = await findUserInSocket(io, { mobileNumber });

  if (!findUser) {
    return io.emit("alertnewUser");
  }

  if (findUser.password !== password) {
    return io.emit("wrongPassword");
  }

  io.emit("alertPageLoginSuccess");
});

module.exports = { signUpBySocket, loginBySocket, alertPageLoginBySocket };
