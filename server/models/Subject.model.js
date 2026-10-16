import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: 1,
      max: 6,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },
    department: {
      type: String,
      default: 'CSE',
    },
    // Professor assigned to this subject
    assignedProfessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Assessment paper configuration (default max marks)
    assessmentConfig: {
      ca1Max: { type: Number, default: 20, min: 1 },
      mseMax: { type: Number, default: 20, min: 1 },
      ca2Max: { type: Number, default: 20, min: 1 },
      endSemMax: { type: Number, default: 60, min: 1 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
