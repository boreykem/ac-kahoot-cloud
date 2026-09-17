import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answers: { type: [String], required: true },
  correctAnswer: { type: Number, required: true }, // Index of the correct answer
  timeLimit: { type: Number, default: 20 },
  points: { type: Number, default: 1000 },
  type: { type: String, default: 'quiz' } // e.g. 'quiz', 'true_false'
});

const quizSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  creatorId: {
    type: String, // References User.id
    required: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  questions: [questionSchema]
}, {
  timestamps: true
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
