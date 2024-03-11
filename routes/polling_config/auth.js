const { Router } = require("express");
const {
  loginUser,
  registerUser,
} = require("../../controllers/polling_config/auth.js");

const authRouter = Router();

authRouter.post("/login", loginUser);

authRouter.post("/signUp", registerUser);

module.exports = { authRouter };
