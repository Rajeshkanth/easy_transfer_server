const {
  updateProfile,
  checkUserName,
  getSavedAccounts,
  saveNewAccount,
} = require("../../controllers/polling_config/user");
const profileRouter = require("express").Router();

profileRouter.post("/updateProfile", updateProfile);
profileRouter.post("/checkUserName", checkUserName);
profileRouter.post("/getBeneficiaryDetails", getSavedAccounts);
profileRouter.post("/addNewBeneficiary", saveNewAccount);

module.exports = { profileRouter };
