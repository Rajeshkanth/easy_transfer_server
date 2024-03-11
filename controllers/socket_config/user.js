const asynchandler = require("express-async-handler");
const { io } = require("../../socket");
const { findUserInSocket } = require("../../utils");

const checkUserNameBySocket = asynchandler(async (data) => {
  const mobileNumber = data.regNumber;
  const numberFound = await findUserInSocket(io, { mobileNumber });

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

const updateUserProfileBySocket = asynchandler(async (data) => {
  const { mobileNumber, name, age, dob, accNum, card, cvv, expireDate } = data;
  const numberFound = await findUserInSocket(io, { mobileNumber });
  if (numberFound) {
    const updateResult = await userModel.updateOne(
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

module.exports = { checkUserNameBySocket, updateUserProfileBySocket };
