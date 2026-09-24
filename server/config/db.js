import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ATLAS_URI = 'mongodb+srv://baureykem_db_user:DJxuh4a0ectYb7er@acmart.9rzln4f.mongodb.net/?appName=acmart';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    try {
      console.log('Attempting connection to MongoDB Atlas fallback...');
      const conn = await mongoose.connect(DEFAULT_ATLAS_URI);
      console.log(`MongoDB Connected (Fallback Atlas): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`Fallback Atlas connection also failed: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
