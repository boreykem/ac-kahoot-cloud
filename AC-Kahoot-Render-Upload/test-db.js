import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}, '-password');
  console.log("Users in DB:", users.length);
  if (users.length > 0) {
    console.log("Users list:");
    users.forEach(u => console.log(u.email));
  }
  process.exit(0);
}
run();
