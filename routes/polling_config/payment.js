const paymentRouter = require("express").Router();
const {
  sendAmount,
  confirmPayment,
  transactionStatus,
  getTransactions,
  checkForAlert,
} = require("../../controllers/polling_config/transactions.js");

paymentRouter.post("/fromPaymentAlert", sendAmount);
paymentRouter.post("/confirm/:tabId", confirmPayment);
paymentRouter.post("/transactionStatus/:tabId", transactionStatus);
paymentRouter.post("/transactionDetails", getTransactions);
paymentRouter.post("/checkForNewAlert", checkForAlert);

module.exports = { paymentRouter };
