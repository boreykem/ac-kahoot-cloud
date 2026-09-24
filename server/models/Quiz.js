import mongoose from 'mongoose';

// Question sub-schema — matches QuizEditor field names exactly
const questionSchema = new mongoose.Schema({
  id: { type: String },
  question: { type: String, default: '' },
  options: { type: [String], default: [] },       // frontend uses 'options'
  correctIndex: { type: Number, default: 0 },     // frontend uses 'correctIndex'
  timeLimit: { type: Number, default: 20 },
  points: { type: Number, default: 10 },
  explanation: { type: String, default: '' },
  type: { type: String, default: 'multiple_choice' },
  image: { type: String, default: '' },
  // Allow flexible question types (fill-in, matching, etc.)
  acceptedAnswers: { type: [String], default: undefined },
  pairs: { type: mongoose.Schema.Types.Mixed, default: undefined }
}, { _id: false, strict: false }); // strict: false allows any extra fields

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
  level: {
    type: String,
    default: 'general'
  },
  category: {
    type: String,
    default: 'General'
  },
  image: {
    type: String,
    default: ''
  },
  // Author info — used for library filtering
  authorId: {
    type: String,
    default: 'official'
  },
  authorEmail: {
    type: String,
    default: 'official'
  },
  authorName: {
    type: String,
    default: 'AC-Kahoot! Official'
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  questions: { type: [questionSchema], default: [] }
}, {
  timestamps: true,
  strict: false // Allow extra fields the server may pass through
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
