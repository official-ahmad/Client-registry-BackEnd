const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Db connection Failed: MONGO_URI is not defined in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("DB Connected Successfully!");
  } catch (err) {
    console.error("Database Connection Failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
