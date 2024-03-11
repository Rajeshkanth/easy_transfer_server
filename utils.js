const { userModel } = require("./model/userModel");

// add new bank account
const updateSavedAccounts = async (res, inputs) => {
  try {
    const updatedUser = await userModel.updateOne(
      { mobileNumber: inputs.mobileNumber },
      { $push: { savedAccounts: inputs.saveNewAccount } }
    );
    return updatedUser;
  } catch (error) {
    return res.status(404).json({ message: "User cannot be updated." });
  }
};

// save transactions
const saveTransactions = async (res, inputs) => {
  try {
    const updatedTransaction = await userModel.updateOne(
      { mobileNumber: inputs.mobileNumber },
      { $push: { transactions: inputs.newTransaction } }
    );
    return updatedTransaction;
  } catch (error) {
    return res.status(404).send("Transaction details not updated");
  }
};

// update user profile
const updateProfileDetails = async (res, inputs) => {
  try {
    userModel.updateOne(
      { mobileNumber: inputs.mobileNumber },
      {
        $set: {
          userName: inputs.name,
          age: inputs.age,
          dob: inputs.dob,
          accNum: inputs.accNum,
          card: inputs.card,
          cvv: inputs.cvv,
          expireDate: inputs.expireDate,
        },
      }
    );
  } catch {
    return res.status(404).send("user details cannot be updated");
  }
};

// find registered user
const findUser = async (res, inputs) => {
  try {
    const findUser = await userModel.findOne({
      mobileNumber: inputs.mobileNumber,
    });
    return findUser;
  } catch {
    return res.status(404).send("User not found");
  }
};

// socket
const findUserInSocket = async (io, inputs) => {
  try {
    const findUser = await userModel.findOne({
      mobileNumber: inputs.mobileNumber,
    });
    return findUser;
  } catch (err) {
    return io.emit("User not found");
  }
};

const saveTransactionsInSocket = async (inputs) => {
  const updatedTransaction = await userModel.updateOne(
    { mobileNumber: inputs.mobileNumber },
    { $push: { transactions: inputs.newTransactions } }
  );
  return updatedTransaction;
};

const updateSavedAccountsBySocket = async (io, inputs) => {
  try {
    const updatedUser = await userModel.updateOne(
      { mobileNumber: inputs.mobileNumber },
      { $push: { savedAccounts: inputs.saveNewAccount } }
    );
    return updatedUser;
  } catch (error) {
    return io.emit("Cannot add new account");
  }
};

module.exports = {
  updateSavedAccounts,
  updateProfileDetails,
  findUser,
  saveTransactions,
  findUserInSocket,
  saveTransactionsInSocket,
  updateSavedAccountsBySocket,
};
