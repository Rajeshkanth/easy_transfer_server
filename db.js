const { default: mongoose } = require("mongoose");

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
  accNum: {
    type: Number,
  },
  card: {
    type: Number,
  },
  cvv: {
    type: Number,
  },
  expireDate: {
    type: String,
  },
});

const collection = new mongoose.model("user", userSchema);

const databaseConnection = async () => {
  await mongoose
    .connect(process.env.EASY_TRANSFER_DB)
    .then(() => {
      console.log("Db is connected");
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = { databaseConnection, collection };
