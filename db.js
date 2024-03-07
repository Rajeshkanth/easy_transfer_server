const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  tabId: String,
  userName: String,
  age: Number,
  dob: String,
  accNum: String,
  card: Number,
  cvv: Number,
  expireDate: String,

  savedAccounts: [
    {
      beneficiaryName: {
        type: String,
        required: true,
      },
      accNum: {
        type: String,
        required: true,
      },
      ifsc: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
      },
    },
  ],
  transactions: [
    {
      date: String,
      name: String,
      amount: Number,
      status: String,
      uid: String,
    },
  ],
});

const collection = new mongoose.model("user", userSchema);

const databaseConnection = async () => {
  await mongoose
    .connect(process.env.EASY_TRANSFER_LOCAL_DB)
    .then(() => {
      console.log("Db is connected");
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = { databaseConnection, collection };
