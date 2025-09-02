const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    mongoose.set('strictQuery', false);
    const connectionParams = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    await mongoose.connect(process.env.MONGO_URI, connectionParams);
    console.log("Connected to database successfully");
  } catch (error) {
    console.log("Could not connect to database:", error);
    
    // Don't crash the serverless function
    // Instead, allow the app to continue and handle DB errors gracefully
  }
};