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
    type: String,
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
      amount: {
        type: Number,
      },
    },
  ],
});

// const savedAccountsSchema = new mongoose.Schema({});

userSchema.pre("save", function (next) {
  if (this.dob) {
    this.dob.setUTCHours(0, 0, 0, 0);
  }
  next();
});

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
