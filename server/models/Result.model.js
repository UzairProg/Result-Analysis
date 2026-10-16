import mongoose from 'mongoose';

/**
 * College Academic Evaluation & Passing Logic:
 * - Total: 100 Marks (Internals: 40 Marks, External/End-Sem: 60 Marks)
 * - Internals (40 Marks):
 *     - CA1 (Continuous Assessment 1): 10 Marks weightage (converted from raw paper marks, e.g. out of 20)
 *     - MSE (Mid Semester Exam)       : 20 Marks weightage (converted from raw paper marks, e.g. out of 20)
 *     - CA2 (Continuous Assessment 2): 10 Marks weightage (converted from raw paper marks, e.g. out of 20)
 * - External (60 Marks):
 *     - End-Sem Exam: 60 Marks weightage (must be >= 20 to pass)
 *
 * Mandatory University Passing Rules:
 * 1. endSem >= 20 (out of 60) is MANDATORY
 * 2. total (internalTotal + endSem) >= 40 (out of 100) is MANDATORY
 * 3. If internal < 20, student can still pass IF endSem is high enough so total >= 40
 *
 * Status:
 *   - "Passed"      : endSem entered, endSem >= 20 AND total >= 40
 *   - "Failed"      : endSem entered, endSem < 20 OR total < 40
 *   - "In-Progress" : endSem not yet entered
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

    // --- CA1: Continuous Assessment 1 (Weightage: 10 Marks) ---
    ca1Raw: { type: Number, default: null },
    ca1Max: { type: Number, default: 20, min: 1 },
    ca1: { type: Number, min: 0, max: 10, default: null },

    // --- MSE: Mid Semester Exam (Weightage: 20 Marks) ---
    mseRaw: { type: Number, default: null },
    mseMax: { type: Number, default: 20, min: 1 },
    mse: { type: Number, min: 0, max: 20, default: null },

    // --- CA2: Continuous Assessment 2 (Weightage: 10 Marks) ---
    ca2Raw: { type: Number, default: null },
    ca2Max: { type: Number, default: 20, min: 1 },
    ca2: { type: Number, min: 0, max: 10, default: null },

    // --- End-Sem: External Examination (Weightage: 60 Marks) ---
    endSemRaw: { type: Number, default: null },
    endSemMax: { type: Number, default: 60, min: 1 },
    endSem: { type: Number, min: 0, max: 60, default: null },

    // --- Computed Fields ---
    internalTotal: {
      type: Number,
      default: 0,
      min: 0,
      max: 40,
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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

// Pre-save hook to auto-scale marks, calculate totals, grade, and status
resultSchema.pre('save', function (next) {
  // Helper to round to 2 decimals
  const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  // 1. Calculate / normalize CA1 (Weightage: 10)
  if (this.ca1Raw !== null && this.ca1Raw !== undefined) {
    const max = Number(this.ca1Max) > 0 ? Number(this.ca1Max) : 10;
    this.ca1 = round2((Math.min(Math.max(0, Number(this.ca1Raw)), max) / max) * 10);
  } else if (this.ca1 !== null && this.ca1 !== undefined) {
    this.ca1 = round2(Math.min(Math.max(0, Number(this.ca1)), 10));
    if (this.ca1Raw === null || this.ca1Raw === undefined) {
      this.ca1Raw = this.ca1;
      this.ca1Max = 10;
    }
  }

  // 2. Calculate / normalize MSE (Weightage: 20)
  if (this.mseRaw !== null && this.mseRaw !== undefined) {
    const max = Number(this.mseMax) > 0 ? Number(this.mseMax) : 20;
    this.mse = round2((Math.min(Math.max(0, Number(this.mseRaw)), max) / max) * 20);
  } else if (this.mse !== null && this.mse !== undefined) {
    this.mse = round2(Math.min(Math.max(0, Number(this.mse)), 20));
    if (this.mseRaw === null || this.mseRaw === undefined) {
      this.mseRaw = this.mse;
      this.mseMax = 20;
    }
  }

  // 3. Calculate / normalize CA2 (Weightage: 10)
  if (this.ca2Raw !== null && this.ca2Raw !== undefined) {
    const max = Number(this.ca2Max) > 0 ? Number(this.ca2Max) : 10;
    this.ca2 = round2((Math.min(Math.max(0, Number(this.ca2Raw)), max) / max) * 10);
  } else if (this.ca2 !== null && this.ca2 !== undefined) {
    this.ca2 = round2(Math.min(Math.max(0, Number(this.ca2)), 10));
    if (this.ca2Raw === null || this.ca2Raw === undefined) {
      this.ca2Raw = this.ca2;
      this.ca2Max = 10;
    }
  }

  // 4. Calculate / normalize EndSem (Weightage: 60)
  if (this.endSemRaw !== null && this.endSemRaw !== undefined) {
    const max = Number(this.endSemMax) > 0 ? Number(this.endSemMax) : 60;
    this.endSem = round2((Math.min(Math.max(0, Number(this.endSemRaw)), max) / max) * 60);
  } else if (this.endSem !== null && this.endSem !== undefined) {
    this.endSem = round2(Math.min(Math.max(0, Number(this.endSem)), 60));
    if (this.endSemRaw === null || this.endSemRaw === undefined) {
      this.endSemRaw = this.endSem;
      this.endSemMax = 60;
    }
  }

  // 5. Total calculations
  this.internalTotal = round2((this.ca1 || 0) + (this.mse || 0) + (this.ca2 || 0));
  this.totalMarks = round2(this.internalTotal + (this.endSem || 0));

  // 6. Determine Status & Grade
  if (this.endSem !== null && this.endSem !== undefined) {
    // University Passing Rule: endSem >= 20 AND totalMarks >= 40
    if (this.endSem >= 20 && this.totalMarks >= 40) {
      this.status = 'Passed';
    } else {
      this.status = 'Failed';
    }

    // 10-Point Grade Scale
    const t = this.totalMarks;
    if (this.status === 'Failed') {
      this.grade = 'F';
      this.gradePoints = 0;
    } else if (t >= 90) {
      this.grade = 'O';
      this.gradePoints = 10;
    } else if (t >= 80) {
      this.grade = 'A+';
      this.gradePoints = 9;
    } else if (t >= 70) {
      this.grade = 'A';
      this.gradePoints = 8;
    } else if (t >= 60) {
      this.grade = 'B+';
      this.gradePoints = 7;
    } else if (t >= 50) {
      this.grade = 'B';
      this.gradePoints = 6;
    } else if (t >= 45) {
      this.grade = 'C';
      this.gradePoints = 5;
    } else if (t >= 40) {
      this.grade = 'D';
      this.gradePoints = 4;
    } else {
      this.grade = 'F';
      this.gradePoints = 0;
    }
  } else {
    this.status = 'In-Progress';
    this.grade = 'P';
    this.gradePoints = 0;
  }

  // 7. Qualitative Academic Remarks
  if (this.internalTotal >= 32) {
    this.remarks = 'Excellent';
  } else if (this.internalTotal >= 24) {
    this.remarks = 'Good';
  } else if (this.internalTotal >= 20) {
    this.remarks = 'Average';
  } else {
    this.remarks = 'Needs Focus (At-Risk)';
  }

  next();
});

const Result = mongoose.model('Result', resultSchema);
export default Result;
