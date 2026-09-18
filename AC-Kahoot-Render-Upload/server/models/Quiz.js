import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  timeLimit: { type: Number, default: 20 },
  points: { type: Number, default: 10 },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
  image: { type: String, default: '' }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  level: { type: String, default: 'general' },
  category: { type: String, default: 'General' },
  image: { type: String, default: '' },
  authorId: { type: String, required: true },
  authorEmail: { type: String, required: true },
  authorName: { type: String, required: true },
  isOfficial: { type: Boolean, default: false },
  questions: [questionSchema]
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
