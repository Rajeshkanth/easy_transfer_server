const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema({
  mobileNumber: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  userName: String,
  age: Number,
  dob: String,
  accNum: Number,
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
        type: Number,
        required: true,
      },
      ifsc: {
        type: String,
        required: true,
      },
      editable: {
        type: Boolean,
      },
      amount: {
        type: Number,
      },
    },
  ],
  Transactions: [
    {
      Date: String,
      Name: String,
      Amount: Number,
      Status: String,
      Uid: String,
    },
  ],
});

// userSchema.pre("save", function (next) {
//   if (this.dob) {
//     this.dob.setUTCHours(0, 0, 0, 0);
//   }
//   next();
// });

const collection = new mongoose.model("user", userSchema);
// const accountCollection = new mongoose.model(
//   "userSaveAccounts",
//   savedAccountsSchema
// );

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
