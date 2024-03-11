const { userModel } = require("../../model/userModel");
const { findUser, saveTransactions } = require("../../utils");

const receivedPaymentAlerts = [];
const confirmationstatus = {};
var uid;
var newAlertReceived = false;

const sendAmount = async (req, res) => {
  const newRequest = req.body.data;
  const { mobileNumber, newTransaction } = req.body;
  number = mobileNumber;
  newAlertReceived = true;
  uid = newTransaction.uid;
  receivedPaymentAlerts.push(newRequest);
  try {
    const userFound = await findUser(res, { mobileNumber });
    if (userFound) {
      await saveTransactions(res, { mobileNumber, newTransaction });
      res.status(200).send({
        date: newRequest.date,
        amount: newRequest.amount,
        description: newRequest.description,
        status: newRequest.status,
      });
    }
  } catch (err) {
    return err;
  }
};

const confirmPayment = async (req, res) => {
  const tabId = req.params.tabId;
  const { action, mobileNumber } = req.body;
  const user = await findUser(res, { mobileNumber });

  switch (action) {
    case "confirm":
      if (user) {
        const transactions = user.transactions;
        const transaction = transactions.find(
          (transaction) => transaction.uid === uid
        );
        if (transaction) {
          transaction.status = "completed";
          await user.save();
          confirmationstatus[tabId] = "confirm";
          receivedPaymentAlerts.splice(req.body.index, 1);
          res.status(200).send("confirmed");
        }
      }
      break;
    case "cancel":
      if (user) {
        const transactions = user.transactions;
        const transaction = transactions.find(
          (transaction) => transaction.uid === uid
        );
        if (transaction) {
          transaction.status = "canceled";
          await user.save();
          confirmationstatus[tabId] = "cancel";
          receivedPaymentAlerts.splice(req.body.index, 1);
          res.status(201).send("canceled");
        }
      }
      break;
  }
};

const transactionStatus = async (req, res) => {
  const tabId = req.params.tabId;
  switch (confirmationstatus[tabId]) {
    case "confirm":
      delete confirmationstatus[tabId];
      res.status(200).send("confirmed");
      break;
    case "cancel":
      delete confirmationstatus[tabId];
      res.status(201).send();
      break;
    default:
      res.status(404).send("Invalid status");
  }
};

const getTransactions = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    const regUser = await findUser(res, { mobileNumber });
    if (!regUser && !regUser.transactions.length > 0) {
      return res.status(404).send("No transaction details found.");
    }

    const transactionDetails = regUser.transactions.map((transaction) => ({
      date: transaction.date,
      name: transaction.name,
      status: transaction.status,
      amount: transaction.amount,
    }));

    res.status(200).json({
      transactions: transactionDetails,
      count: transactionDetails.length,
    });
  } catch (err) {
    return res.status(500).send("user not found");
  }
};

const checkForAlert = async (req, res) => {
  if (!newAlertReceived) {
    return await res.status(201).send("no alert");
  }

  await res.status(200).send("new alert");
  newAlertReceived = false;
};

const renderPaymentAlerts = async (req, res) => {
  let loggedNumber = req.query.mobileNumber;
  loggedNumber = loggedNumber.replace(/\s/g, "");
  const mobileNumber = `+${loggedNumber}`;

  const currentUserAlerts = receivedPaymentAlerts.filter(
    (alert) => alert.mobileNumber === mobileNumber
  );

  await res.render("base", {
    title: "payment alert",
    alertValue: currentUserAlerts,
    mobileNumber: loggedNumber,
  });
};

const paid = async (req, res) => {
  const mobileNumber = req.query.mobileNumber;
  await res.render("paid", {
    mobileNumber: mobileNumber,
  });
};

const canceled = async (req, res) => {
  const mobileNumber = req.query.mobileNumber;
  await res.render("canceled", {
    mobileNumber: mobileNumber,
  });
};

const configuration = async (req, res) => {
  await res.render("login", { connectionType: process.env.CONNECTION_METHOD });
};

module.exports = {
  sendAmount,
  confirmPayment,
  transactionStatus,
  getTransactions,
  renderPaymentAlerts,
  paid,
  canceled,
  configuration,
  checkForAlert,
};
