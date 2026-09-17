import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'teacher', 'student'],
    default: 'teacher',
  },
  license: {
    type: String,
    default: 'free',
  },
  avatar: {
    type: String,
    default: '👨‍🏫',
  },
  school: {
    type: String,
    default: 'គ្រឹះស្ថានអប់រំកម្ពុជា',
  },
  aiGenerationsCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true, // Will automatically manage createdAt and updatedAt
});

const User = mongoose.model('User', userSchema);

export default User;
