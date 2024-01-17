const { default: mongoose } = require("mongoose");
const express = require("express");
const app = express();

const userSchema = new mongoose.Schema({
  mobileNumber: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    reqired: true,
  },
  userName: {
    type: String,
  },
  age: {
    type: Number,
  },
  dob: {
    type: Date,
  },
});

const collection = new mongoose.model("user", userSchema);

const databaseConnection = async () => {
  await mongoose
    .connect(process.env.EASY_TRANSFER_DB)
    .then(() => {
      console.log("Db is connected");

      app.listen(8080, () => {
        console.log("server running on port 8080");
      });
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = { databaseConnection, collection };
