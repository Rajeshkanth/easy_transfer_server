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

// Age: age,
// DOB: dob,
// AccNum: accNumber,
// Card: card,
// CVV: cvv,
// ExpireDate: expireDate,

// const data = {
//   mobileNumber: 99426,
//   password: 123,
// };

const receivedPaymentAlerts = [];
const confirmationstatus = {};
const port = process.env.PORT;

if (process.env.CONNECTION_METHOD === "polling") {
  app.use(bodyParser.json());

  app.post("/connectionType", (req, res) => {
    res.status(201).send({ type: "polling" });
  });

  app.post("/fromPaymentAlert", async (req, res) => {
    newRequest = req.body.data;
    receivedPaymentAlerts.push(newRequest);
    collection.insertMany([newRequest]);
    console.log("saved");
    res.status(200).send("received successfully");
  });

  app.post("/confirm/:tabId", (req, res) => {
    console.log(req.params.tabId);
    const tabId = req.params.tabId;
    const action = req.body.Action;
    if (action === "confirm") {
      confirmationstatus[tabId] = "confirm";
      console.log("confirmed");
      receivedPaymentAlerts.splice(req.body.index, 1);
      res.status(200).send();
    } else if (action === "cancel") {
      confirmationstatus[tabId] = "cancel";
      console.log("canceled");
      receivedPaymentAlerts.splice(req.body.index, 1);
      res.status(201).send();
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
        res
          .status(200)
          .send({ userName: name, age: Age, dob: DOB, accNum: AccNum });
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
      });
      console.log(numberFound);
    } else {
      console.log("number not found in user name checking");
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

  io.on("connection", (socket) => {
    console.log(`user connected: ${val++} , ${socket.id}`);

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

          if (updateDetails.modifiedCount > 0) {
            console.log("New details added");
            // const updatedUser = await collection.findOne({
            //   mobileNumber: num,
            // });
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

      const user = await collection.findOneAndUpdate(
        { MobileNumber: number },
        { $set: { "Transactions.$.Status": "completed" } },
        { new: true }
      );

      if (user) {
        console.log("Transaction status updated successfully:", user);

        // Get the details of the last transaction
        const lastTransaction = user.Transactions[user.Transactions.length - 1];

        // Emit the details of the last transaction back to the client
        io.emit("transactionDetails", lastTransaction);
      } else {
        console.log("No user found with the provided number.", number);
      }

      if (data.clicked) {
        io.to(data.tabId).emit("success", true);
      }
    });

    socket.on("canceled", (data) => {
      console.log(`payment canceled by socket ${data.tabId}`);
      const itemIndex = receivedPaymentAlerts.findIndex(
        (item) => item.tabId === data.tabId
      );

      if (itemIndex !== -1) {
        receivedPaymentAlerts.splice(itemIndex, 1);
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
        });
        console.log(numberFound);
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
        // res.status(200).send();
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
      const { num } = data;
      const regUser = await collection.findOne({ mobileNumber: num });
      // console.log("from save Acc ,", regUser);
      if (regUser && regUser.savedAccounts.length > 0) {
        regUser.savedAccounts.forEach((savedAccount) => {
          io.emit("allSavedAccounts", {
            beneficiaryName: savedAccount.beneficiaryName,
            accNum: savedAccount.accNum,
            ifsc: savedAccount.ifsc,
            editable: savedAccount.editable,
          });
        });
      }
    });

    // socket.on("saveNewBeneficiary", async (data) => {
    //   const { SavedBeneficiaryName, SavedAccNum, SavedIfsc, editable, num } =
    //     data;

    //   const saveNewAccount = {
    //     beneficiaryName: SavedBeneficiaryName,
    //     accNum: SavedAccNum,
    //     ifsc: SavedIfsc,
    //     editable: editable,
    //   };

    //   try {
    //     const userFound = await collection.findOne({ mobileNumber: num });

    //     if (userFound) {
    //       const initialSavedAccountsLength = userFound.savedAccounts.length;

    //       const updateDetails = await collection.updateOne(
    //         {
    //           mobileNumber: num,
    //         },
    //         {
    //           $push: {
    //             savedAccounts: saveNewAccount,
    //           },
    //         }
    //       );

    //       if (updateDetails.modifiedCount > 0) {
    //         console.log("New details added");
    //         const updatedUser = await collection.findOne({ mobileNumber: num });
    //         const updatedSavedAccountsLength = updatedUser.savedAccounts.length;

    //         if (updatedSavedAccountsLength > initialSavedAccountsLength) {
    //           const lastAddedBeneficiary =
    //             updatedUser.savedAccounts.slice(-1)[0];

    //           io.emit("getSavedBeneficiary", {
    //             beneficiaryName: lastAddedBeneficiary.beneficiaryName,
    //             accNum: lastAddedBeneficiary.accNum,
    //             ifsc: lastAddedBeneficiary.ifsc,
    //             editable: lastAddedBeneficiary.editable,
    //           });
    //         }
    //       }
    //     } else {
    //       console.log("User not found");
    //     }
    //   } catch (error) {
    //     console.error("Error saving new beneficiary:", error);
    //   }
    // });

    socket.on("saveNewBeneficiary", async (data) => {
      const { SavedBeneficiaryName, SavedAccNum, SavedIfsc, editable, num } =
        data;

      const saveNewAccount = {
        beneficiaryName: SavedBeneficiaryName,
        accNum: SavedAccNum,
        ifsc: SavedIfsc,
        editable: editable,
      };

      try {
        const userFound = await collection.findOne({ mobileNumber: num });

        if (userFound) {
          const existingBeneficiary = userFound.savedAccounts.find(
            (account) => account.accNum === SavedAccNum
          );
          if (existingBeneficiary) {
            console.log(
              "Beneficiary with the same account number already exists for this user"
            );
          } else {
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

    socket.on("deleteItem", async (data) => {
      const accNumToDelete = data.accNum;

      try {
        const filter = { mobileNumber: data.num };
        const update = {
          $pull: {
            savedAccounts: { accNum: accNumToDelete },
          },
        };

        // Use the findOneAndUpdate method to update and get the original document
        const result = await collection.findOneAndUpdate(filter, update, {
          returnDocument: "before", // "before" returns the document before the update
        });

        // Check if the document and savedAccounts array exist
        if (result && result.value && result.value.savedAccounts) {
          // Access the deleted item
          const deletedBeneficiary = result.value.savedAccounts.find(
            (account) => account.accNum === accNumToDelete
          );

          console.log("Deleted Beneficiary:", deletedBeneficiary);
        } else {
          console.log("Document or savedAccounts not found.");
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        // Handle the error as needed
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

  // const port = process.env.PORT;
  databaseConnection();

  server.listen(port, () => {
    console.log("server running on ", port);
  });
}
