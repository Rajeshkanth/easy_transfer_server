const { userModel } = require("../../model/userModel");
const asyncHandler = require("express-async-handler");
const { findUser } = require("../../utils");

//registerUser function
const registerUser = asyncHandler(async function registerUser(req, res) {
  const { mobileNumber, password } = req.body;
  const existingUser = await findUser(res, { mobileNumber });
  const data = {
    mobileNumber: mobile,
    password: password,
  };
  existingUser
    ? res.status(201).send("user already")
    : userModel.insertMany([data]);
  res.status(200).send("user added");
});

//loginUser function
const loginUser = asyncHandler(async function loginUser(req, res) {
  const { mobileNumber, password } = req.body;
  console.log(mobileNumber);
  const user = await findUser(res, { mobileNumber });
  user
    ? user.password === password
      ? res.status(200).send("ok")
      : res.status(202).send("wrong password")
    : res.status(201).send("new user");
});

module.exports = { registerUser, loginUser };
