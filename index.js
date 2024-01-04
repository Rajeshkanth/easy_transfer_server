require("dotenv").config();

const serverURl = process.env.REACT_APP_SOCKET_API;
// const pollingSite = `${serverURl}/polling`;
// const socketStie = process.env.CONNECTION_METHOD;

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

if (process.env.CONNECTION_METHOD !== "socket") {
  app.use(bodyParser.json());

  app.post("/connectionType", (req, res) => {
    res.status(201).send({ type: "polling" });
  });

  app.post("/fromPaymentAlert", (req, res) => {
    //   console.log(req.body);
    newRequest = req.body.data;
    receivedPaymentAlerts.push(newRequest);
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
    console.log("server running on port 8080");
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
  const port = 3010;
  server.listen(port, () => {
    console.log("server running on ", port);
  });
}
