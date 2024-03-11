require("dotenv").config();
const { databaseConnection } = require("./db.js");
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { authRouter } = require("./routes/polling_config/auth.js");
const { paymentRouter } = require("./routes/polling_config/payment.js");
const {
  renderPaymentAlerts,
  paid,
  canceled,
  configuration,
} = require("./controllers/polling_config/transactions.js");
const { profileRouter } = require("./routes/polling_config/user.js");

app.set("view engine", "ejs");
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.static(__dirname + "/views"));

const port = process.env.PORT;

app.use(bodyParser.json());

app.post("/connectionType", (req, res) => {
  res.status(201).send({ type: "polling" });
});

app.use("/api/auth", authRouter);
app.use("/api/transaction", paymentRouter);
app.use("/api/user", profileRouter);

app.get("/", configuration);
app.get("/paid", paid);
app.get("/canceled", canceled);
app.get("/homePage", renderPaymentAlerts);

app.listen(port, async () => {
  await databaseConnection();
});
