require("dotenv").config();

const serverURl = process.env.REACT_APP_SOCKET_API;
// const pollingSite = `${serverURl}/polling`;
// const socketStie = process.env.CONNECTION_METHOD;

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { default: mongoose } = require("mongoose");
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

const userSchema = new mongoose.Schema({
  mobileNumber: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    reqired: true,
  },
  userName: {
    type: String,
  },
  age: {
    type: Number,
  },
  dob: {
    type: Date,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isNew) {
    // If the document is not new, do not generate a new _id
    return next();
  }

  try {
    // Find the highest existing _id in the collection
    const highestIdDocument = await this.constructor
      .findOne({}, { _id: 1 })
      .sort({ _id: -1 })
      .limit(1)
      .exec();

    // Calculate the next sequential _id
    this._id = highestIdDocument ? highestIdDocument._id + 1 : 1;

    next();
  } catch (err) {
    next(err);
  }
});

const collection = new mongoose.model("user", userSchema);
// const data = {
//   mobileNumber: 99426,
//   password: 123,
// };

const receivedPaymentAlerts = [];
const confirmationstatus = {};
const port = process.env.PORT;
// collection.insertMany(receivedPaymentAlerts);

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
    // const status = confirmationstatus[tabId];
    const action = req.body.Action;
    //   console.log(status);
    if (action === "confirm") {
      // confirmed = true;
      confirmationstatus[tabId] = "confirm";
      console.log("confirmed");
      receivedPaymentAlerts.splice(req.body.index, 1);
      res.status(200).send();
    } else if (action === "cancel") {
      // canceled = true;
      confirmationstatus[tabId] = "cancel";
      console.log("canceled");
      receivedPaymentAlerts.splice(req.body.index, 1);
      res.status(201).send();
    }
  });
  app.post("/success/:tabId", (req, res) => {
    const tabId = req.params.tabId;

    if (confirmationstatus[tabId] === "confirm") {
      // confirmed = false;
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
    // console.log(req.body);
    const { Mobile, Password } = req.body;
    // console.log(req.body);
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
  mongoose
    .connect(process.env.EASY_TRANSFER_DB)
    .then(() => {
      console.log("Db is connected");

      app.listen(port, () => {
        console.log("server running on port 8080");
      });
    })
    .catch((error) => {
      console.log(error);
    });
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
        io.to(data.tabId).emit("success", true); // Emit success to specific tabId
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
  mongoose
    .connect(process.env.EASY_TRANSFER_DB)
    .then(() => {
      console.log("Db is connected");

      app.listen(8080, () => {
        console.log("server running on port 8080");
      });
    })
    .catch((error) => {
      console.log(error);
    });

  server.listen(port, () => {
    console.log("server running on ", port);
  });
}
