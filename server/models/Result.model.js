import mongoose from 'mongoose';

/**
 * Passing Logic:
 * - endSem >= 20 (out of 60) is MANDATORY
 * - total (internal + external) >= 40 is MANDATORY
 * - If internal < 20, student can still pass IF endSem is high enough for total >= 40
 * Status:
 *   - "Pass"    : endSem >= 20 AND total >= 40
 *   - "Fail"    : endSem < 20 OR total < 40
 *   - "At-Risk" : endSem >= 20 BUT total is between 40-49 (borderline)
 */
const resultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required'],
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Professor ID is required'],
    },
    academicYear: {
      type: String,
      required: true,
      default: '2025-26',
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    // Internal Marks (40 total)
    ca1: { type: Number, min: 0, max: 10, default: null },
    mse: { type: Number, min: 0, max: 20, default: null },
    ca2: { type: Number, min: 0, max: 10, default: null },
    // External Marks (60 total)
    endSem: { type: Number, min: 0, max: 60, default: null },
    // Computed fields
    internalTotal: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      default: 'P',
    },
    gradePoints: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Passed', 'Failed', 'In-Progress'],
      default: 'In-Progress',
    },
    remarks: {
      type: String,
      default: '',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound unique index: one result per student per subject per year
resultSchema.index({ studentId: 1, subjectId: 1, academicYear: 1 }, { unique: true });

// Pre-save hook to auto-compute totals, grade, and status
resultSchema.pre('save', function (next) {
  const c1 = this.ca1;
  const m = this.mse;
  const c2 = this.ca2;
  const e = this.endSem;

  this.internalTotal = (c1 || 0) + (m || 0) + (c2 || 0);
  this.totalMarks = this.internalTotal + (e || 0);

  // Determine status and grade
  if (e !== null) {
    if (e >= 20 && this.totalMarks >= 40) {
      this.status = 'Passed';
    } else {
      this.status = 'Failed';
    }

    // Calculate Grade ONLY if endSem is entered
    const t = this.totalMarks;
    if (t >= 90) { this.grade = 'O'; this.gradePoints = 10; }
    else if (t >= 80) { this.grade = 'A+'; this.gradePoints = 9; }
    else if (t >= 70) { this.grade = 'A'; this.gradePoints = 8; }
    else if (t >= 60) { this.grade = 'B+'; this.gradePoints = 7; }
    else if (t >= 50) { this.grade = 'B'; this.gradePoints = 6; }
    else if (t >= 45) { this.grade = 'C'; this.gradePoints = 5; }
    else if (t >= 40) { this.grade = 'D'; this.gradePoints = 4; }
    else { this.grade = 'F'; this.gradePoints = 0; }
  } else {
    this.status = 'In-Progress';
    this.grade = 'P';
    this.gradePoints = 0;
  }

  // Calculate Remarks
  if (this.internalTotal > 30) this.remarks = 'Excellent';
  else if (this.internalTotal >= 20) this.remarks = 'Good';
  else this.remarks = 'Needs Focus';

  next();
});

const Result = mongoose.model('Result', resultSchema);
export default Result;
