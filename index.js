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
    //   console.log(req.body);
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
      console.log("Number found");
      const updateResult = await collection.updateOne(
        { mobileNumber: data },
        { $set: { userName: name } }
      );
      if (updateResult.modifiedCount > 0) {
        res.status(200).send({ userName: name });
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
      res.status(200).send({ user: numberFound.userName });
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
  app.listen(8080, () => {
    console.log("server running on port 8080");
  });

  databaseConnection();
}

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

  io.on("connection", (socket) => {
    console.log(`user connected: ${val++} , ${socket.id}`);
    databaseConnection();

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

    socket.on("paymentPageConnected", (data) => {
      let socketId;
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
    });

    socket.on("join_success_room", (data) => {
      const socketID = data.SocketRoom;
      socket.join(socketID);
      console.log("room joined from success page", socketID);
    });

    socket.on("clicked", (data) => {
      console.log("tab id", data.tabId);
      console.log(`payment confirmed by socket to ${data.tabId}`);
      const itemIndex = receivedPaymentAlerts.findIndex(
        (item) => item.tabId === data.tabId
      );

      if (itemIndex !== -1) {
        receivedPaymentAlerts.splice(itemIndex, 1);
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
        io.emit("userNameAvailable", { user: numberFound.userName });
        console.log(numberFound);
      } else {
        io.emit("userNotFound");
        console.log("number not found in user name checking");
      }
    });

    socket.on("updateProfile", async (data) => {
      const { num, name } = data;
      const numberFound = await collection.findOne({ mobileNumber: num });
      console.log("from profile");

      if (numberFound) {
        console.log("Number found");
        const updateResult = await collection.updateOne(
          { mobileNumber: num },
          { $set: { userName: name } }
        );
        if (updateResult.modifiedCount > 0) {
          io.emit("profileUpdated", {
            userName: name,
          });
          console.log("Name updated");
        }
      } else {
        console.log("not found");
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

  const port = process.env.PORT;

  server.listen(port, () => {
    console.log("server running on ", port);
  });
}
