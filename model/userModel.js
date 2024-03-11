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

const userModel = new mongoose.model("user", userSchema);

module.exports = { userModel };
