const asynchandler = require("express-async-handler");
const { findUserInSocket, saveTransactionsInSocket } = require("../../utils");
const { io } = require("../../socket");
const receivedPaymentAlerts = [];
const socketRooms = new Map();
var uid;

const renderPaymentAlertsBySocket = async (req, res) => {
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

const sendAmountBySocket = asynchandler(async (data, socket) => {
  let socketId;
  const { mobileNumber, newTransactions } = data;
  uid = newTransactions.uid;
  const room = data.newReceiver.tabId;
  data.newReceiver.socketRoom = socketId;
  receivedPaymentAlerts.push(data.newReceiver);
  socketRooms.set(socket.id, room);

  for (const [key, value] of socketRooms.entries()) {
    if (value === room) {
      socketId = room;
      break;
    }
  }
  socket.join(room);

  const userFound = await findUserInSocket(io, { mobileNumber });

  if (userFound) {
    const updatedTransaction = await saveTransactionsInSocket({
      mobileNumber,
      newTransactions,
    });

    if (!updatedTransaction) {
      return io.emit("notSaved");
    }
    io.to(mobileNumber).emit("newAlert", {
      newOne: true,
    });

    io.to(room).emit("getLastTransactions", {
      date: newTransactions.date,
      amount: newTransactions.amount,
      description: newTransactions.description,
      status: newTransactions.status,
    });
  }
});

const joinSuccessPage = asynchandler((data, socket) => {
  const socketID = data.socketRoom;
  socket.join(socketID);
});

const confirmBySocket = asynchandler(async (data) => {
  const mobileNumber = data.mobileNumber;
  const itemIndex = receivedPaymentAlerts.findIndex(
    (item) => item.tabId === data.tabId
  );
  itemIndex !== -1 ? receivedPaymentAlerts.splice(itemIndex, 1) : null;

  const user = await findUserInSocket(io, { mobileNumber });

  if (user) {
    const transactions = user.transactions;

    const transaction = transactions.find(
      (transaction) => transaction.uid === uid
    );

    if (data.clicked) {
      transaction.status = "completed";
      await user.save();
      io.to(data.tabId).emit("success", true);
    }
  }
});

const cancelBySocket = asynchandler(async (data) => {
  const mobileNumber = data.mobileNumber;
  const itemIndex = receivedPaymentAlerts.findIndex(
    (item) => item.tabId === data.tabId
  );
  if (itemIndex !== -1) {
    receivedPaymentAlerts.splice(itemIndex, 1);
  }
  const user = await findUserInSocket(io, { mobileNumber });
  if (user) {
    const transactions = user.transactions;
    const transaction = transactions.find(
      (transaction) => transaction.uid === uid
    );

    if (data.cancel) {
      transaction.status = "canceled";
      await user.save();
      io.to(data.tabId).emit("failed", true);
    }
  }
});

const getTransactionsBySocket = asynchandler(async (data) => {
  const { mobileNumber } = data;
  const regUser = await findUserInSocket(io, { mobileNumber });
  if (regUser && regUser.transactions.length > 0) {
    regUser.transactions.forEach((transaction) => {
      io.emit("transactionDetailsFromDb", {
        count: regUser.transactions.length,
        date: transaction.date,
        name: transaction.name,
        amount: transaction.amount,
        status: transaction.status,
      });
    });
  }
});

module.exports = {
  renderPaymentAlertsBySocket,
  sendAmountBySocket,
  joinSuccessPage,
  confirmBySocket,
  cancelBySocket,
  getTransactionsBySocket,
};
