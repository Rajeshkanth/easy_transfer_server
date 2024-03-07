require("dotenv").config();
const { databaseConnection, collection } = require("./db");
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.static(__dirname + "/views"));

const receivedPaymentAlerts = [];
const confirmationstatus = {};
const port = process.env.PORT;

if (process.env.CONNECTION_METHOD === "polling") {
  app.use(bodyParser.json());
  var number;
  var uid;
  var newAlertReceived = false;
  app.post("/connectionType", (req, res) => {
    res.status(201).send({ type: "polling" });
  });

  app.post("/fromPaymentAlert", async (req, res) => {
    const newRequest = req.body.data;
    const { mobileNumber, newTransaction } = req.body;
    number = mobileNumber;
    newAlertReceived = true;
    uid = newTransaction.uid;
    receivedPaymentAlerts.push(newRequest);
    try {
      const userFound = await collection.findOne({
        mobileNumber: mobileNumber,
      });
      if (userFound) {
        await collection.updateOne(
          { mobileNumber: number },
          { $push: { transactions: newTransaction } }
        );
        res.status(200).send({
          date: newRequest.date,
          amount: newRequest.dmount,
          description: newRequest.description,
          status: newRequest.dtatus,
        });
      }
    } catch (err) {
      return err;
    }
  });

  app.post("/checkForNewAlert", async (req, res) => {
    if (newAlertReceived) {
      res.status(200).send("new alert");
      newAlertReceived = false;
    } else {
      res.status(201).send("no alert");
    }
  });

  app.post("/confirm/:tabId", async (req, res) => {
    const tabId = req.params.tabId;
    const action = req.body.Action;
    const user = await collection.findOne({ mobileNumber: number });

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
  });

  app.post("/success/:tabId", (req, res) => {
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
  });

  app.post("/signUp", async (req, res) => {
    const { mobile, password } = req.body;
    const existingUser = await collection.findOne({ mobileNumber: mobile });
    const data = {
      mobileNumber: mobile,
      password: password,
    };
    existingUser
      ? res.status(201).send("user already")
      : collection.insertMany([data]);
    res.status(200).send("user added");
  });

  app.post("/login", async (req, res) => {
    const { mobile, password } = req.body;
    const newUser = await collection.findOne({ mobileNumber: mobile });
    newUser
      ? newUser.password === password
        ? res.status(200).send("ok")
        : res.status(202).send("wrong password")
      : res.status(201).send("new user");
  });

  app.post("/updateProfile", async (req, res) => {
    const { mobileNumber, name, age, dob, accNum, card, cvv, expireDate } =
      req.body;
    const numberFound = await collection.findOne({
      mobileNumber: mobileNumber,
    });
    if (numberFound) {
      const updateResult = await collection.updateOne(
        { mobileNumber: mobileNumber },
        {
          $set: {
            userName: name,
            age: age,
            dob: dob,
            accNum: accNum,
            card: card,
            cvv: cvv,
            expireDate: expireDate,
          },
        }
      );
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
    } else {
      res.status(500).send("Failed to update profile");
    }
  });
  app.post("/checkUserName", async (req, res) => {
    const number = req.body.regNumber;
    const numberFound = await collection.findOne({ mobileNumber: number });
    if (numberFound) {
      res.status(200).send({
        user: numberFound.userName,
        age: numberFound.age,
        dob: numberFound.dob,
        accNum: numberFound.accNum,
        card: numberFound.card,
        cvv: numberFound.cvv,
        expireDate: numberFound.expireDate,
      });
    }
  });
  app.post("/addNewBeneficiary", async (req, res) => {
    const { savedBeneficiaryName, savedAccNum, savedIfsc, mobileNumber } =
      req.body;
    const saveNewAccount = {
      beneficiaryName: savedBeneficiaryName,
      accNum: savedAccNum,
      ifsc: savedIfsc,
    };
    try {
      const userFound = await collection.findOne({
        mobileNumber: mobileNumber,
      });
      if (userFound) {
        const existingBeneficiary = userFound.savedAccounts.find((account) => {
          return parseInt(account.accNum) === parseInt(savedAccNum);
        });
        if (!existingBeneficiary) {
          const initialSavedAccountsLength = userFound.savedAccounts.length;
          const updateDetails = await collection.updateOne(
            { mobileNumber: mobileNumber },
            { $push: { savedAccounts: saveNewAccount } }
          );
          if (updateDetails.modifiedCount > 0) {
            const updatedUser = await collection.findOne({
              mobileNumber: mobileNumber,
            });
            const updatedSavedAccountsLength = updatedUser.savedAccounts.length;
            if (updatedSavedAccountsLength > initialSavedAccountsLength) {
              const lastAddedBeneficiary =
                updatedUser.savedAccounts.slice(-1)[0];
              res.status(200).send({
                beneficiaryName: lastAddedBeneficiary.beneficiaryName,
                accNum: lastAddedBeneficiary.accNum,
                ifsc: lastAddedBeneficiary.ifsc,
              });
            }
          }
        } else {
          res
            .status(409)
            .send(
              "Beneficiary with the same account number already exists for this user"
            );
        }
      } else {
        res.status(404).send("User not found");
      }
    } catch (error) {
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/getBeneficiaryDetails", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      const regUser = await collection.findOne({ mobileNumber: mobileNumber });
      if (regUser && regUser.savedAccounts.length > 0) {
        const beneficiaryDetails = regUser.savedAccounts.map(
          (savedAccount) => ({
            beneficiaryName: savedAccount.beneficiaryName,
            accNum: savedAccount.accNum,
            ifsc: savedAccount.ifsc,
          })
        );
        res.status(200).json(beneficiaryDetails);
      } else {
        res.status(404).send("No beneficiary details found.");
      }
    } catch (error) {
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/transactionDetails", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      const regUser = await collection.findOne({ mobileNumber: mobileNumber });
      if (regUser && regUser.transactions.length > 0) {
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
      } else {
        res.status(404).send("No transaction details found.");
      }
    } catch (err) {
      return err;
    }
  });

  app.post("/alertPageLogin", async (req, res) => {
    const { mobileNumber, password } = req.body;
    const findUser = await collection.findOne({ mobileNumber: mobileNumber });
    if (findUser) {
      findUser.password === password
        ? res.status(200).send("login success")
        : res.status(201).send("wrong password");
    } else {
      res.status(202).send("login failed");
    }
  });

  app.get("/paid", (req, res) => {
    const mobileNumber = req.query.mobileNumber;
    res.render("paid", {
      mobileNumber: mobileNumber,
    });
  });

  app.get("/canceled", (req, res) => {
    const mobileNumber = req.query.mobileNumber;
    res.render("canceled", {
      mobileNumber: mobileNumber,
    });
  });

  app.get("/", (req, res) => {
    res.render("login", { connectionType: "polling" });
  });

  app.get("/homePage", (req, res) => {
    let loggedNumber = req.query.mobileNumber;
    loggedNumber = loggedNumber.replace(/\s/g, "");
    const mobileNumber = `+${loggedNumber}`;

    const currentUserAlerts = receivedPaymentAlerts.filter(
      (alert) => alert.mobileNumber === mobileNumber
    );

    res.render("base", {
      title: "payment alert",
      alertValue: currentUserAlerts,
      mobileNumber: loggedNumber,
    });
  });

  app.listen(port, () => {});
  databaseConnection();
}

//  socket mode

if (process.env.CONNECTION_METHOD === "socket") {
  const http = require("http");
  const { Server } = require("socket.io");
  app.use(cors());
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const socketRooms = new Map();
  var number;
  var uid;

  io.on("connection", (socket) => {
    io.emit("connection_type", {
      type: "socket",
    });

    socket.on("signUp", async (data) => {
      const { mobileNumber, password } = data;
      const existingUser = await collection.findOne({
        mobileNumber: mobileNumber,
      });

      const newUser = {
        mobileNumber: mobileNumber,
        password: password,
      };

      existingUser
        ? io.emit("userRegisteredAlready")
        : collection.insertMany([newUser]);

      io.emit("userRegistered", {
        mobileNumber: mobileNumber,
      });
    });

    socket.on("login", async (data) => {
      const { mobileNumber, password } = data;
      number = mobileNumber;
      const newUser = await collection.findOne({ mobileNumber: mobileNumber });

      newUser
        ? newUser.password === password
          ? io.emit("loginSuccess", {
              mobileNumber: mobileNumber,
            })
          : io.emit("loginFailed")
        : io.emit("newUser");
    });

    socket.on("paymentPage", async (data) => {
      let socketId;
      const { mobileNumber, newTransactions } = data;
      number = mobileNumber;
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

      try {
        const userFound = await collection.findOne({
          mobileNumber: mobileNumber,
        });

        if (userFound) {
          await collection.updateOne(
            { mobileNumber: mobileNumber },
            { $push: { transactions: newTransactions } }
          );

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
      } catch (err) {
        return err;
      }
    });

    socket.on("successPage", (data) => {
      const socketID = data.socketRoom;
      socket.join(socketID);
    });

    socket.on("confirmed", async (data) => {
      const itemIndex = receivedPaymentAlerts.findIndex(
        (item) => item.tabId === data.tabId
      );
      itemIndex !== -1 ? receivedPaymentAlerts.splice(itemIndex, 1) : null;

      const user = await collection.findOne({ mobileNumber: number });
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

    socket.on("canceled", async (data) => {
      const itemIndex = receivedPaymentAlerts.findIndex(
        (item) => item.tabId === data.tabId
      );
      if (itemIndex !== -1) {
        receivedPaymentAlerts.splice(itemIndex, 1);
      }
      const user = await collection.findOne({ mobileNumber: number });
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

    socket.on("checkUserName", async (data) => {
      const mobileNumber = data.regNumber;
      const numberFound = await collection.findOne({
        mobileNumber: mobileNumber,
      });

      numberFound
        ? io.emit("userNameAvailable", {
            user: numberFound.userName,
            age: numberFound.age,
            dob: numberFound.dob,
            accNum: numberFound.accNum,
            card: numberFound.card,
            cvv: numberFound.cvv,
            expireDate: numberFound.expireDate,
          })
        : null;
    });

    socket.on("updateProfile", async (data) => {
      const { mobileNumber, name, age, dob, accNum, card, cvv, expireDate } =
        data;
      const numberFound = await collection.findOne({
        mobileNumber: mobileNumber,
      });
      if (numberFound) {
        const updateResult = await collection.updateOne(
          { mobileNumber: mobileNumber },
          {
            $set: {
              userName: name,
              age: age,
              dob: dob,
              accNum: accNum,
              card: card,
              cvv: cvv,
              expireDate: expireDate,
            },
          }
        );
        updateResult.modifiedCount > 0
          ? io.emit("profileUpdated", {
              userName: name,
              age: age,
              dob: dob,
              accNum: accNum,
            })
          : null;
      }
    });

    socket.on("getSavedAccounts", async (data) => {
      const { mobileNumber } = data;
      const regUser = await collection.findOne({ mobileNumber: mobileNumber });
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

    socket.on("getTransactionDetails", async (data) => {
      const { mobileNumber } = data;
      const regUser = await collection.findOne({ mobileNumber: mobileNumber });
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

    socket.on("saveNewBeneficiary", async (data) => {
      const { savedBeneficiaryName, savedAccNum, savedIfsc, mobileNumber } =
        data;
      const saveNewAccount = {
        beneficiaryName: savedBeneficiaryName,
        accNum: savedAccNum,
        ifsc: savedIfsc,
      };

      try {
        const userFound = await collection.findOne({
          mobileNumber: mobileNumber,
        });
        if (userFound) {
          const existingBeneficiary = userFound.savedAccounts.find(
            (account) => {
              return account.accNum === parseInt(savedAccNum);
            }
          );
          if (!existingBeneficiary) {
            const initialSavedAccountsLength = userFound.savedAccounts.length;
            const updateDetails = await collection.updateOne(
              { mobileNumber: mobileNumber },
              { $push: { savedAccounts: saveNewAccount } }
            );
            if (updateDetails.modifiedCount > 0) {
              const updatedUser = await collection.findOne({
                mobileNumber: mobileNumber,
              });
              const updatedSavedAccountsLength =
                updatedUser.savedAccounts.length;
              if (updatedSavedAccountsLength > initialSavedAccountsLength) {
                const lastAddedBeneficiary =
                  updatedUser.savedAccounts.slice(-1)[0];
                io.emit("getSavedBeneficiary", {
                  beneficiaryName: lastAddedBeneficiary.beneficiaryName,
                  accNum: lastAddedBeneficiary.accNum,
                  ifsc: lastAddedBeneficiary.ifsc,
                });
              }
            }
          }
        }
      } catch (error) {
        return error;
      }
    });

    socket.on("alertPageLogin", async (data) => {
      const { mobileNumber, password } = data;
      const findUser = await collection.findOne({ mobileNumber: mobileNumber });

      if (findUser) {
        if (findUser.password === password) {
          socket.join(mobileNumber);
          io.to(mobileNumber).emit("loginSuccess");
        } else {
          io.emit("wrongPassword");
        }
      } else {
        io.emit("newUser");
      }
    });
  });

  app.get("/", (req, res) => {
    res.render("login", {
      connectionType: "socket",
    });
  });

  app.get("/paid", (req, res) => {
    const mobileNumber = req.query.mobileNumber;
    res.render("paid", { mobileNumber: mobileNumber });
  });

  app.get("/canceled", (req, res) => {
    const mobileNumber = req.query.mobileNumber;
    res.render("canceled", { mobileNumber: mobileNumber });
  });

  app.get("/homePage", (req, res) => {
    let loggedNumber = req.query.mobileNumber;
    loggedNumber = loggedNumber.replace(/\s/g, "");
    const mobileNumber = `+${loggedNumber}`;

    const currentUserAlerts = receivedPaymentAlerts.filter(
      (alert) => alert.mobileNumber === mobileNumber
    );
    res.render("base", {
      title: "payment alert",
      alertValue: currentUserAlerts,
      mobileNumber: loggedNumber,
    });
  });

  databaseConnection();
  server.listen(port);
}
