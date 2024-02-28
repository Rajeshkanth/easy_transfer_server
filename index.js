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

    const { num, newTransaction } = req.body;
    number = num;
    newAlertReceived = true;
    uid = newTransaction.Uid;
    receivedPaymentAlerts.push(newRequest);

    try {
      const userFound = await collection.findOne({ mobileNumber: num });
      if (userFound) {
        const updateDetails = await collection.updateOne(
          { mobileNumber: num },
          { $push: { Transactions: newTransaction } }
        );

        if (updateDetails.modifiedCount > 0) {
          console.log("New details added", newRequest);
        }
        res.status(200).send({
          Date: newRequest.Date,
          Amount: newRequest.Amount,
          Description: newRequest.Description,
          Status: newRequest.Status,
        });
      } else {
        console.log("User not found");
      }
    } catch (err) {
      console.log(err);
    }

    console.log("saved");
  });

  app.post("/CheckForNewAlert", async (req, res) => {
    if (newAlertReceived) {
      newAlertReceived = false;
      res.status(200).send();
    } else {
      res.status(201).send();
    }
  });

  app.post("/confirm/:tabId", async (req, res) => {
    console.log(req.params.tabId);
    const tabId = req.params.tabId;
    const action = req.body.Action;

    if (action === "confirm") {
      const user = await collection.findOne({ mobileNumber: number });

      if (user) {
        const transactions = user.Transactions;

        const transaction = transactions.find(
          (transaction) => transaction.Uid === uid
        );

        if (transaction && action) {
          transaction.Status = "completed";
          await user.save();
          confirmationstatus[tabId] = "confirm";
          receivedPaymentAlerts.splice(req.body.index, 1);
          console.log("Transaction status updated successfully.");
          res.status(200).send();
        } else {
          console.log("No transaction found");
        }
      } else {
        console.log("No user found with the number", number);
      }
    } else if (action === "cancel") {
      const user = await collection.findOne({ mobileNumber: number });
      newAlert = false;
      if (user) {
        const transactions = user.Transactions;

        const transaction = transactions.find(
          (transaction) => transaction.Uid === uid
        );
        console.log(transaction, uid);
        if (transaction && action) {
          transaction.Status = "canceled";
          await user.save();
          confirmationstatus[tabId] = "cancel";
          receivedPaymentAlerts.splice(req.body.index, 1);
          console.log("Transaction status updated successfully.");
          res.status(201).send();
        } else {
          console.log("No transaction found");
        }
      } else {
        console.log("No user found with the number", number);
      }
    }
  });

  app.post("/success/:tabId", (req, res) => {
    const tabId = req.params.tabId;
    if (confirmationstatus[tabId] === "confirm") {
      delete confirmationstatus[tabId];
      console.log("/success :", tabId);
      res.status(200).send("confirmed");
    } else if (confirmationstatus[tabId] === "cancel") {
      delete confirmationstatus[tabId];
      console.log("canceled :", tabId);
      res.status(201).send();
    }
  });

  app.post("/toDB", async (req, res) => {
    const { Mobile, Password } = req.body;
    const existingUser = await collection.findOne({ mobileNumber: Mobile });
    if (existingUser) {
      console.log("User Already");
      res.status(201).send();
    } else {
      const data = {
        mobileNumber: Mobile,
        password: Password,
      };
      collection.insertMany([data]);
      res.status(200).send();
    }
  });

  app.post("/loginRequest", async (req, res) => {
    const { Mobile, Password } = req.body;
    const newUser = await collection.findOne({ mobileNumber: Mobile });

    if (newUser) {
      if (newUser.password === Password) {
        res.status(200).send();
        console.log("logged in");
      } else {
        res.status(202).send();
        console.log("Password isn't match");
      }
    } else {
      res.status(201).send();
      console.log("User mail is not registerd");
    }
  });

  app.post("/updateProfile", async (req, res) => {
    const { data, name, Age, DOB, AccNum, Card, CVV, ExpireDate } = req.body;

    const numberFound = await collection.findOne({ mobileNumber: data });
    console.log("from profile");
    if (numberFound) {
      // res.status(200).send();
      console.log("Number found");
      const updateResult = await collection.updateOne(
        { mobileNumber: data },
        {
          $set: {
            userName: name,
            age: Age,
            dob: DOB,
            accNum: AccNum,
            card: Card,
            cvv: CVV,
            expireDate: ExpireDate,
          },
        }
      );
      if (updateResult.modifiedCount > 0) {
        res.status(200).send({
          userName: name,
          age: Age,
          dob: DOB,
          accNum: AccNum,
          card: Card,
          cvv: CVV,
          expireDate: ExpireDate,
        });
        console.log("Name updated");
      }
    } else {
      res.status(500).send("Failed to update profile");
      console.log("not found");
    }
  });

  app.post("/checkUserName", async (req, res) => {
    const number = req.body.regNumber;
    console.log("Logged as", number);
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
      console.log(numberFound);
    } else {
      console.log("number not found in user name checking");
    }
  });

  app.post("/saveNewBeneficiary", async (req, res) => {
    try {
      const { SavedBeneficiaryName, SavedAccNum, SavedIfsc, editable, num } =
        req.body;
      console.log(parseInt(SavedAccNum));
      const saveNewAccount = {
        beneficiaryName: SavedBeneficiaryName,
        accNum: SavedAccNum,
        ifsc: SavedIfsc,
        editable: editable,
      };

      const userFound = await collection.findOne({ mobileNumber: num });

      if (userFound) {
        console.log(parseInt(SavedAccNum));
        const existingBeneficiary = userFound.savedAccounts.find((account) => {
          return account.accNum === parseInt(SavedAccNum);
        });
        console.log(existingBeneficiary);

        if (existingBeneficiary) {
          console.log(
            "Beneficiary with the same account number already exists for this user"
          );
          res
            .status(409)
            .send(
              "Beneficiary with the same account number already exists for this user"
            );
        } else {
          const initialSavedAccountsLength = userFound.savedAccounts.length;
          const updateDetails = await collection.updateOne(
            { mobileNumber: num },
            { $push: { savedAccounts: saveNewAccount } }
          );

          if (updateDetails.modifiedCount > 0) {
            console.log("New details added");
            const updatedUser = await collection.findOne({ mobileNumber: num });
            const updatedSavedAccountsLength = updatedUser.savedAccounts.length;

            if (updatedSavedAccountsLength > initialSavedAccountsLength) {
              const lastAddedBeneficiary =
                updatedUser.savedAccounts.slice(-1)[0];
              res.status(200).json({
                beneficiaryName: lastAddedBeneficiary.beneficiaryName,
                accNum: lastAddedBeneficiary.accNum,
                ifsc: lastAddedBeneficiary.ifsc,
              });
            }
          }
        }
      } else {
        console.log("User not found");
        res.status(404).send("User not found");
      }
    } catch (error) {
      console.error("Error saving new beneficiary:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/getBeneficiaryDetails", async (req, res) => {
    try {
      const { num } = req.body;

      const regUser = await collection.findOne({ mobileNumber: num });

      if (regUser && regUser.savedAccounts.length > 0) {
        const beneficiaryDetails = regUser.savedAccounts.map(
          (savedAccount) => ({
            beneficiaryName: savedAccount.beneficiaryName,
            accNum: savedAccount.accNum,
            ifsc: savedAccount.ifsc,
            editable: savedAccount.editable,
          })
        );

        res.status(200).json(beneficiaryDetails);
      } else {
        res.status(404).send("No beneficiary details found.");
      }
    } catch (error) {
      console.error("Error fetching beneficiary details:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/getSavedAccountsForProfile", async (req, res) => {
    try {
      const { num } = req.body;
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.savedAccounts.length > 0) {
        const beneficiaryDetails = regUser.savedAccounts.map(
          (savedAccount) => ({
            Name: savedAccount.beneficiaryName,
            Account: savedAccount.accNum,
          })
        );
        res.status(200).json(beneficiaryDetails);
      } else {
        res.status(404).send("No beneficiary details found.");
      }
    } catch (err) {
      console.log(err);
    }
  });
  app.post("/getSavedTransactionsForProfile", async (req, res) => {
    try {
      const { num } = req.body;
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.Transactions.length > 0) {
        const transactionDetails = regUser.Transactions.map((transaction) => ({
          Date: transaction.Date,
          Name: transaction.Name,
          Status: transaction.Status,
          Amount: transaction.Amount,
        }));
        res.status(200).json({
          transactions: transactionDetails,
          count: transactionDetails.length,
        });
      } else {
        res.status(404).send("No transaction details found.");
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.post("/transactionDetailsForTransactionPage", async (req, res) => {
    try {
      const { num } = req.body;
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.Transactions.length > 0) {
        const transactionDetails = regUser.Transactions.map((transaction) => ({
          Date: transaction.Date,
          Name: transaction.Name,
          Status: transaction.Status,
          Amount: transaction.Amount,
        }));
        res.status(200).json(transactionDetails);
      } else {
        res.status(404).send("No transaction details found.");
      }
    } catch (err) {
      console.log(err);
    }
  });

  //////////////////////////////////////////////

  app.get("/paid", (req, res) => {
    res.render("paid");
  });

  app.get("/canceled", (req, res) => {
    res.render("canceled");
  });

  app.get("/", (req, res) => {
    res.render("base", {
      title: "payment alert",
      AlertValue: receivedPaymentAlerts,
    });
  });

  app.listen(port, () => {
    console.log("server running on port ,", port);
  });
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

  var val = 0;
  const socketRooms = new Map();
  var number;
  var uid;

  io.on("connection", (socket) => {
    const tabId = socket.handshake.query.tabId;
    console.log(`user connected: ${val++} , ${tabId}`);

    io.emit("connection_type", {
      type: "socket",
    });

    socket.on("signUpUser", async (data) => {
      const { Mobile, Password } = data;
      const existingUser = await collection.findOne({ mobileNumber: Mobile });
      if (existingUser) {
        console.log("User Already");
        io.emit("userRegisteredAlready");
      } else {
        const data = {
          mobileNumber: Mobile,
          password: Password,
        };
        collection.insertMany([data]);
        io.emit("userRegistered");
      }
    });

    socket.on("login", async (data) => {
      const { Mobile, Password } = data;
      const newUser = await collection.findOne({ mobileNumber: Mobile });
      if (newUser) {
        if (newUser.password === Password) {
          io.emit("loginSuccess");
          console.log("logged in");
        } else {
          io.emit("loginFailed");
          console.log("Password isn't match");
        }
      } else {
        io.emit("newUser");
        console.log("User mail is not registerd");
      }
    });

    socket.on("paymentPageConnected", async (data) => {
      let socketId;
      const { num, NewTransactions } = data;
      number = num;
      uid = NewTransactions.Uid;
      console.log(uid);
      console.log(NewTransactions);
      const room = data.NewReceiver.tabId;
      console.log(data.NewReceiver);
      data.NewReceiver.socketRoom = socketId;
      receivedPaymentAlerts.push(data.NewReceiver);

      socketRooms.set(socket.id, room);
      for (const [key, value] of socketRooms.entries()) {
        if (value === room) {
          socketId = room;
          break;
        }
      }
      socket.join(room);
      try {
        const userFound = await collection.findOne({ mobileNumber: num });
        if (userFound) {
          const updateDetails = await collection.updateOne(
            { mobileNumber: num },
            { $push: { Transactions: NewTransactions } }
          );

          io.emit("newAlert", {
            newOne: true,
          });

          if (updateDetails.modifiedCount > 0) {
            console.log("New details added");
          }
          io.emit("getLastTransactions", {
            Date: NewTransactions.Date,
            Amount: NewTransactions.Amount,
            Description: NewTransactions.Description,
            Status: NewTransactions.Status,
          });
        } else {
          console.log("User not found");
        }
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("join_success_room", (data) => {
      const socketID = data.SocketRoom;
      socket.join(socketID);
      console.log("room joined from success page", socketID);
    });

    socket.on("clicked", async (data) => {
      console.log("tab id", data.tabId);
      console.log(`payment confirmed by socket to ${data.tabId}`);
      const itemIndex = receivedPaymentAlerts.findIndex(
        (item) => item.tabId === data.tabId
      );
      if (itemIndex !== -1) {
        receivedPaymentAlerts.splice(itemIndex, 1);
      }
      const user = await collection.findOne({ mobileNumber: number });
      if (user) {
        const transactions = user.Transactions;

        const transaction = transactions.find(
          (transaction) => transaction.Uid === uid
        );
        if (transaction && data.clicked) {
          transaction.Status = "completed";
          await user.save();
          console.log("Transaction status updated successfully.");
          io.emit("transactionDetails", transaction);
        } else {
          console.log("No transaction found with the provided transactionId.");
        }
      } else {
        console.log("No user found with the provided MobileNumber:", number);
      }

      if (data.clicked) {
        console.log("from clicked event");
        io.to(data.tabId).emit("success", true);
      }
    });

    socket.on("canceled", async (data) => {
      console.log(`payment canceled by socket ${data.tabId}`);
      const itemIndex = receivedPaymentAlerts.findIndex(
        (item) => item.tabId === data.tabId
      );

      if (itemIndex !== -1) {
        receivedPaymentAlerts.splice(itemIndex, 1);
      }

      const user = await collection.findOne({ mobileNumber: number });
      if (user) {
        const transactions = user.Transactions;
        const transaction = transactions.find(
          (transaction) => transaction.Uid === uid
        );
        if (transaction && data.cancel) {
          transaction.Status = "canceled";
          await user.save();
          console.log("Transaction status updated successfully.");
          io.emit("transactionDetails", transaction);
        } else {
          console.log("No transaction found with the provided transactionId.");
        }
      } else {
        console.log("No user found with the provided MobileNumber:", number);
      }
      if (data.cancel) {
        io.to(data.tabId).emit("failed", true);
      }
    });
    socket.on("checkUserName", async (data) => {
      const number = data.regNumber;
      const numberFound = await collection.findOne({ mobileNumber: number });
      if (numberFound) {
        io.emit("userNameAvailable", {
          user: numberFound.userName,
          age: numberFound.age,
          dob: numberFound.dob,
          accNum: numberFound.accNum,
          card: numberFound.card,
          cvv: numberFound.cvv,
          expireDate: numberFound.expireDate,
        });
      } else {
        io.emit("userNotFound");
        console.log("number not found in user name checking");
      }
    });

    socket.on("updateProfile", async (data) => {
      const { num, name, age, DOB, AccNum, Card, CVV, ExpireDate } = data;
      const numberFound = await collection.findOne({ mobileNumber: num });
      console.log("from profile");

      if (numberFound) {
        console.log("Number found");
        const updateResult = await collection.updateOne(
          { mobileNumber: num },
          {
            $set: {
              userName: name,
              age: age,
              dob: DOB,
              accNum: AccNum,
              card: Card,
              cvv: CVV,
              expireDate: ExpireDate,
            },
          }
        );
        if (updateResult.modifiedCount > 0) {
          io.emit("profileUpdated", {
            userName: name,
            age: age,
            dob: DOB,
            accNum: AccNum,
          });
          console.log("Name updated");
        }
      } else {
        console.log("not found");
      }
    });

    socket.on("fetchList", async (data) => {
      const { num, emit } = data;
      console.log(emit);
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.savedAccounts.length > 0) {
        regUser.savedAccounts.forEach((savedAccount) => {
          io.emit("allSavedAccounts", {
            beneficiaryName: savedAccount.beneficiaryName,
            accNum: savedAccount.accNum,
            ifsc: savedAccount.ifsc,
            editable: savedAccount.editable,
            emitted: true,
          });
        });
      }
    });

    // for beneficiary page

    socket.on("getTransactionDetails", async (data) => {
      const { num } = data;
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.Transactions.length > 0) {
        regUser.Transactions.forEach((transaction) => {
          io.emit("transactionDetailsFromDb", {
            Date: transaction.Date,
            Name: transaction.Name,
            Amount: transaction.Amount,
            Status: transaction.Status,
          });
        });
      } else {
        console.log("no transact found");
      }
    });

    socket.on("getTransactionDetailsCount", async (data) => {
      const { num } = data;
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.Transactions.length > 0) {
        regUser.Transactions.forEach((transaction) => {
          io.emit("transactionsCountFromDB", {
            count: regUser.Transactions.length,

            Date: transaction.Date,
            Name: transaction.Name,
            Amount: transaction.Amount,
            Status: transaction.Status,
          });
        });
      }
    });

    socket.on("getSavedAccountsForProfile", async (data) => {
      const { num } = data;
      const regUser = await collection.findOne({ mobileNumber: num });
      if (regUser && regUser.savedAccounts.length > 0) {
        regUser.savedAccounts.forEach((account) => {
          io.emit("savedAccountsFromDb", {
            count: regUser.savedAccounts.length,
            beneficiaryName: account.beneficiaryName,
            accNum: account.accNum,
            ifsc: account.ifsc,
          });
        });
      }
    });

    socket.on("saveNewBeneficiary", async (data) => {
      const { SavedBeneficiaryName, SavedAccNum, SavedIfsc, editable, num } =
        data;
      console.log(parseInt(SavedAccNum));
      const saveNewAccount = {
        beneficiaryName: SavedBeneficiaryName,
        accNum: SavedAccNum,
        ifsc: SavedIfsc,
        editable: editable,
      };

      try {
        const userFound = await collection.findOne({ mobileNumber: num });

        if (userFound) {
          console.log(parseInt(SavedAccNum));
          const existingBeneficiary = userFound.savedAccounts.find(
            (account) => {
              return account.accNum === parseInt(SavedAccNum);
            }
          );
          console.log(existingBeneficiary);

          if (existingBeneficiary) {
            console.log(
              "Beneficiary with the same account number already exists for this user"
            );
          } else {
            const initialSavedAccountsLength = userFound.savedAccounts.length;
            const updateDetails = await collection.updateOne(
              { mobileNumber: num },
              { $push: { savedAccounts: saveNewAccount } }
            );

            if (updateDetails.modifiedCount > 0) {
              console.log("New details added");
              const updatedUser = await collection.findOne({
                mobileNumber: num,
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
                  editable: lastAddedBeneficiary.editable,
                });
              }
            }
          }
        } else {
          console.log("User not found");
        }
      } catch (error) {
        console.error("Error saving new beneficiary:", error);
      }
    });
  });

  app.get("/paid", (req, res) => {
    res.render("paid");
  });

  app.get("/canceled", (req, res) => {
    res.render("canceled");
  });

  app.get("/", (req, res) => {
    res.render("base", {
      title: "payment alert",
      AlertValue: receivedPaymentAlerts,
    });
  });

  databaseConnection();

  server.listen(port, () => {
    console.log("server running on ", port);
  });
}
