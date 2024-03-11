const { default: mongoose } = require("mongoose");

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

module.exports = { databaseConnection };
