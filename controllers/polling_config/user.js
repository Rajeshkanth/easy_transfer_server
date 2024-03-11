const {
  findUser,
  updateSavedAccounts,
  updateProfileDetails,
} = require("../../utils");

const updateProfile = async (req, res) => {
  const { mobileNumber, name, age, dob, accNum, card, cvv, expireDate } =
    req.body;

  const numberFound = await findUser(res, { mobileNumber });

  if (!numberFound) {
    return res.status(500).send("Failed to update profile");
  }

  const updateResult = await updateProfileDetails(res, {
    mobileNumber,
    name,
    age,
    dob,
    accNum,
    card,
    cvv,
    expireDate,
  });

  if (updateResult.modifiedCount > 0) {
    res.status(200).send({
      userName: name,
      age: age,
      dob: dob,
      accNum: accNum,
      card: card,
      cvv: cvv,
      expireDate: expireDate,
    });
  }
};

const checkUserName = async (req, res) => {
  const mobileNumber = req.body.regNumber;
  const numberFound = await findUser(res, { mobileNumber });
  if (numberFound) {
    res.status(200).send({
      userName: numberFound.userName,
      age: numberFound.age,
      dob: numberFound.dob,
      accNum: numberFound.accNum,
      card: numberFound.card,
      cvv: numberFound.cvv,
      expireDate: numberFound.expireDate,
    });
  }
};

const getSavedAccounts = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    const regUser = await findUser(res, { mobileNumber });

    if (!regUser && !regUser.savedAccounts.length > 0) {
      return res.status(404).send("No beneficiary details found.");
    }

    const beneficiaryDetails = regUser.savedAccounts.map((savedAccount) => ({
      beneficiaryName: savedAccount.beneficiaryName,
      accNum: savedAccount.accNum,
      ifsc: savedAccount.ifsc,
    }));
    res.status(200).json(beneficiaryDetails);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const saveNewAccount = async (req, res) => {
  const { savedBeneficiaryName, savedAccNum, savedIfsc, mobileNumber } =
    req.body;
  const saveNewAccount = {
    beneficiaryName: savedBeneficiaryName,
    accNum: savedAccNum,
    ifsc: savedIfsc,
  };
  try {
    const userFound = await findUser(res, { mobileNumber });

    if (!userFound) {
      return res.status(404).send("User not found");
    }

    const existingBeneficiary = userFound.savedAccounts.find((account) => {
      return parseInt(account.accNum) === parseInt(savedAccNum);
    });

    if (existingBeneficiary) {
      return res
        .status(409)
        .send(
          "Beneficiary with the same account number already exists for this user"
        );
    }

    const initialSavedAccountsLength = userFound.savedAccounts.length;

    const updateDetails = await updateSavedAccounts(res, {
      mobileNumber,
      saveNewAccount,
    });

    if (updateDetails.modifiedCount > 0) {
      const updatedUser = await findUser(res, { mobileNumber });
      const updatedSavedAccountsLength = updatedUser.savedAccounts.length;

      if (updatedSavedAccountsLength > initialSavedAccountsLength) {
        const lastAddedBeneficiary = updatedUser.savedAccounts.slice(-1)[0];
        res.status(200).send({
          beneficiaryName: lastAddedBeneficiary.beneficiaryName,
          accNum: lastAddedBeneficiary.accNum,
          ifsc: lastAddedBeneficiary.ifsc,
        });
      }
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  updateProfile,
  checkUserName,
  getSavedAccounts,
  saveNewAccount,
};
