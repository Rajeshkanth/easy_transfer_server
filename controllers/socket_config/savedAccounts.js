const asynchandler = require("express-async-handler");
const { io } = require("../../socket");
const {
  findUserInSocket,
  updateSavedAccountsBySocket,
} = require("../../utils");

const saveNewBeneficiaryBySocket = asynchandler(async (data) => {
  const { savedBeneficiaryName, savedAccNum, savedIfsc, mobileNumber } = data;
  const saveNewAccount = {
    beneficiaryName: savedBeneficiaryName,
    accNum: savedAccNum,
    ifsc: savedIfsc,
  };

  const userFound = await findUserInSocket(io, { mobileNumber });
  if (userFound) {
    const existingBeneficiary = userFound.savedAccounts.find((account) => {
      return account.accNum === parseInt(savedAccNum);
    });
    if (!existingBeneficiary) {
      const initialSavedAccountsLength = userFound.savedAccounts.length;
      const updateDetails = await updateSavedAccountsBySocket(io, {
        mobileNumber,
        saveNewAccount,
      });
      if (updateDetails.modifiedCount > 0) {
        const updatedUser = await findUserInSocket(io, { mobileNumber });
        const updatedSavedAccountsLength = updatedUser?.savedAccounts?.length;
        if (updatedSavedAccountsLength > initialSavedAccountsLength) {
          const lastAddedBeneficiary = updatedUser.savedAccounts.slice(-1)[0];
          io.emit("getSavedBeneficiary", {
            beneficiaryName: lastAddedBeneficiary.beneficiaryName,
            accNum: lastAddedBeneficiary.accNum,
            ifsc: lastAddedBeneficiary.ifsc,
          });
        }
      }
    }
  }
});

const getSavedAccountsBySocket = asynchandler(async (data) => {
  const { mobileNumber } = data;
  const regUser = await findUserInSocket(io, { mobileNumber });
  if (regUser && regUser.savedAccounts.length > 0) {
    regUser.savedAccounts.forEach((savedAccount) => {
      io.emit("allSavedAccounts", {
        count: regUser.savedAccounts.length,
        beneficiaryName: savedAccount.beneficiaryName,
        accNum: savedAccount.accNum,
        ifsc: savedAccount.ifsc,
      });
    });
  }
});

module.exports = { saveNewBeneficiaryBySocket, getSavedAccountsBySocket };
