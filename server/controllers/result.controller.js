import Result from '../models/Result.model.js';
import User from '../models/User.model.js';
import Subject from '../models/Subject.model.js';

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const sanitizeMarkValue = (value, max) => {
  const text = normalizeTextValue(value);
  if (text === null) return null;
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (max && parsed > max) return max; // Cap at max rather than silently discarding
  return Math.round(parsed * 100) / 100;
};

/**
 * POST /api/results
 * Professor/Admin: Enter or update marks for a single student
 */
export const upsertResult = async (req, res) => {
  try {
    const {
      studentId,
      subjectId,
      academicYear = '2025-26',
      semester,
      ca1Raw,
      ca1Max,
      ca1,
      mseRaw,
      mseMax,
      mse,
      ca2Raw,
      ca2Max,
      ca2,
      endSemRaw,
      endSemMax,
      endSem,
    } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    if (req.user.role === 'Professor' && String(subject.assignedProfessor) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject.' });
    }

    let result = await Result.findOne({ studentId, subjectId, academicYear });
    if (!result) {
      result = new Result({
        studentId,
        subjectId,
        professorId: req.user._id,
        academicYear,
        semester: semester || subject.semester,
      });
    }

    // Apply partial updates if provided
    if (ca1Max !== undefined) result.ca1Max = Number(ca1Max) || 20;
    if (ca1Raw !== undefined) result.ca1Raw = sanitizeMarkValue(ca1Raw, result.ca1Max);
    else if (ca1 !== undefined) result.ca1 = sanitizeMarkValue(ca1, 10);

    if (mseMax !== undefined) result.mseMax = Number(mseMax) || 20;
    if (mseRaw !== undefined) result.mseRaw = sanitizeMarkValue(mseRaw, result.mseMax);
    else if (mse !== undefined) result.mse = sanitizeMarkValue(mse, 20);

    if (ca2Max !== undefined) result.ca2Max = Number(ca2Max) || 20;
    if (ca2Raw !== undefined) result.ca2Raw = sanitizeMarkValue(ca2Raw, result.ca2Max);
    else if (ca2 !== undefined) result.ca2 = sanitizeMarkValue(ca2, 10);

    if (endSemMax !== undefined) result.endSemMax = Number(endSemMax) || 60;
    if (endSemRaw !== undefined) result.endSemRaw = sanitizeMarkValue(endSemRaw, result.endSemMax);
    else if (endSem !== undefined) result.endSem = sanitizeMarkValue(endSem, 60);

    result.professorId = req.user._id;
    await result.save();

    res.status(200).json({ success: true, message: 'Marks saved successfully.', result });
  } catch (error) {
    console.error('upsertResult error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/results/bulk
 * Professor/Admin: Bulk enter/update marks (with section support for CA1, MSE, CA2, EndSem)
 */
export const bulkUpsertResults = async (req, res) => {
  try {
    const {
      subjectId,
      results,
      academicYear = '2025-26',
      semester,
      assessmentType, // 'ca1' | 'mse' | 'ca2' | 'internal' | 'endSem' | 'all'
      ca1Max,
      mseMax,
      ca2Max,
      endSemMax,
    } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    if (req.user.role === 'Professor' && String(subject.assignedProfessor) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject.' });
    }

    // Optionally update subject default max marks if specified
    if (ca1Max || mseMax || ca2Max || endSemMax) {
      if (!subject.assessmentConfig) subject.assessmentConfig = {};
      if (ca1Max) subject.assessmentConfig.ca1Max = Number(ca1Max);
      if (mseMax) subject.assessmentConfig.mseMax = Number(mseMax);
      if (ca2Max) subject.assessmentConfig.ca2Max = Number(ca2Max);
      if (endSemMax) subject.assessmentConfig.endSemMax = Number(endSemMax);
      await subject.save();
    }

    const rows = Array.isArray(results) ? results : [];
    const skippedRows = [];
    const savedDocs = [];

    const effectiveCa1Max = Number(ca1Max) || subject.assessmentConfig?.ca1Max || 20;
    const effectiveMseMax = Number(mseMax) || subject.assessmentConfig?.mseMax || 20;
    const effectiveCa2Max = Number(ca2Max) || subject.assessmentConfig?.ca2Max || 20;
    const effectiveEndSemMax = Number(endSemMax) || subject.assessmentConfig?.endSemMax || 60;

    for (const row of rows) {
      const prn = normalizeTextValue(row.prn ?? row.PRN);
      let student = null;

      if (row.studentId) {
        student = await User.findById(row.studentId).select('_id identifier');
      }
      if (!student && prn) {
        student = await User.findOne({ identifier: prn, role: 'Student' }).select('_id identifier');
      }

      if (!student) {
        skippedRows.push({ prn: prn || 'Unknown', reason: 'Student not found in system' });
        continue;
      }

      let doc = await Result.findOne({
        studentId: student._id,
        subjectId,
        academicYear,
      });

      if (!doc) {
        doc = new Result({
          studentId: student._id,
          subjectId,
          professorId: req.user._id,
          academicYear,
          semester: semester || subject.semester,
          ca1Max: effectiveCa1Max,
          mseMax: effectiveMseMax,
          ca2Max: effectiveCa2Max,
          endSemMax: effectiveEndSemMax,
        });
      }

      // Update max configurations on document
      if (ca1Max !== undefined || doc.ca1Max === undefined) doc.ca1Max = effectiveCa1Max;
      if (mseMax !== undefined || doc.mseMax === undefined) doc.mseMax = effectiveMseMax;
      if (ca2Max !== undefined || doc.ca2Max === undefined) doc.ca2Max = effectiveCa2Max;
      if (endSemMax !== undefined || doc.endSemMax === undefined) doc.endSemMax = effectiveEndSemMax;

      // Handle specific section or all sections
      if (!assessmentType || assessmentType === 'all' || assessmentType === 'ca1' || assessmentType === 'internal') {
        if (row.ca1Raw !== undefined) {
          doc.ca1Raw = sanitizeMarkValue(row.ca1Raw, doc.ca1Max);
        } else if (row.ca1 !== undefined) {
          doc.ca1 = sanitizeMarkValue(row.ca1, 10);
        }
      }

      if (!assessmentType || assessmentType === 'all' || assessmentType === 'mse' || assessmentType === 'internal') {
        if (row.mseRaw !== undefined) {
          doc.mseRaw = sanitizeMarkValue(row.mseRaw, doc.mseMax);
        } else if (row.mse !== undefined) {
          doc.mse = sanitizeMarkValue(row.mse, 20);
        }
      }

      if (!assessmentType || assessmentType === 'all' || assessmentType === 'ca2' || assessmentType === 'internal') {
        if (row.ca2Raw !== undefined) {
          doc.ca2Raw = sanitizeMarkValue(row.ca2Raw, doc.ca2Max);
        } else if (row.ca2 !== undefined) {
          doc.ca2 = sanitizeMarkValue(row.ca2, 10);
        }
      }

      if (!assessmentType || assessmentType === 'all' || assessmentType === 'endSem') {
        if (row.endSemRaw !== undefined) {
          doc.endSemRaw = sanitizeMarkValue(row.endSemRaw, doc.endSemMax);
        } else if (row.endSem !== undefined) {
          doc.endSem = sanitizeMarkValue(row.endSem, 60);
        }
      }

      doc.professorId = req.user._id;
      await doc.save();
      savedDocs.push(doc);
    }

    res.status(200).json({
      success: true,
      message: 'Marks updated successfully.',
      count: savedDocs.length,
      skipped: skippedRows,
    });
  } catch (error) {
    console.error('bulkUpsertResults error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/results/student/:studentId
 * Student/Admin: Get all results for a student with SGPA & CGPA
 */
export const getStudentResults = async (req, res) => {
  try {
    if (req.user.role === 'Student' && String(req.user._id) !== req.params.studentId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const results = await Result.find({ studentId: req.params.studentId })
      .populate('subjectId', 'subjectName subjectCode credits semester department assessmentConfig')
      .populate('professorId', 'name email')
      .sort({ semester: 1 });

    const semesterMap = {};
    results.forEach((r) => {
      if (!semesterMap[r.semester]) semesterMap[r.semester] = [];
      semesterMap[r.semester].push(r);
    });

    const sgpaData = Object.entries(semesterMap).map(([sem, resList]) => {
      const totalCredits = resList.reduce((acc, r) => acc + (r.subjectId?.credits || 0), 0);
      const earnedPoints = resList.reduce((acc, r) => acc + ((r.gradePoints || 0) * (r.subjectId?.credits || 0)), 0);
      const sgpa = totalCredits > 0 ? (earnedPoints / totalCredits).toFixed(2) : '0.00';
      return { semester: parseInt(sem), sgpa: parseFloat(sgpa), totalCredits };
    });

    const totalCredits = sgpaData.reduce((acc, s) => acc + s.totalCredits, 0);
    const weightedPoints = sgpaData.reduce((acc, s) => acc + (s.sgpa * s.totalCredits), 0);
    const cgpa = totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : '0.00';

    res.json({ success: true, results, sgpaData, cgpa: parseFloat(cgpa) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/results/class/:subjectId
 * Professor/Admin: Get class results & detailed analysis for a subject
 */
export const getClassResults = async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    const filter = { subjectId: req.params.subjectId };
    if (academicYear) filter.academicYear = academicYear;

    const subject = await Subject.findById(req.params.subjectId).populate('assignedProfessor', 'name email');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const results = await Result.find(filter)
      .populate('studentId', 'name identifier email currentSemester')
      .populate('subjectId', 'subjectName subjectCode credits semester assessmentConfig')
      .sort({ totalMarks: -1 });

    const totalStudents = results.length;
    const passCount = results.filter((r) => r.status === 'Passed').length;
    const failCount = results.filter((r) => r.status === 'Failed').length;
    const inProgressCount = results.filter((r) => r.status === 'In-Progress').length;
    const atRiskCount = results.filter((r) => (r.internalTotal < 20) || (r.status === 'Passed' && r.totalMarks < 50)).length;

    // Averages
    const totalMarksSum = results.reduce((acc, r) => acc + (r.totalMarks || 0), 0);
    const internalSum = results.reduce((acc, r) => acc + (r.internalTotal || 0), 0);
    const ca1Sum = results.reduce((acc, r) => acc + (r.ca1 || 0), 0);
    const mseSum = results.reduce((acc, r) => acc + (r.mse || 0), 0);
    const ca2Sum = results.reduce((acc, r) => acc + (r.ca2 || 0), 0);
    const endSemSum = results.filter((r) => r.endSem !== null).reduce((acc, r) => acc + (r.endSem || 0), 0);
    const endSemEnteredCount = results.filter((r) => r.endSem !== null).length;

    const classAverage = totalStudents > 0 ? (totalMarksSum / totalStudents).toFixed(1) : 0;
    const internalAverage = totalStudents > 0 ? (internalSum / totalStudents).toFixed(1) : 0;
    const ca1Average = totalStudents > 0 ? (ca1Sum / totalStudents).toFixed(1) : 0;
    const mseAverage = totalStudents > 0 ? (mseSum / totalStudents).toFixed(1) : 0;
    const ca2Average = totalStudents > 0 ? (ca2Sum / totalStudents).toFixed(1) : 0;
    const endSemAverage = endSemEnteredCount > 0 ? (endSemSum / endSemEnteredCount).toFixed(1) : 0;

    const highest = results[0]?.totalMarks || 0;
    const lowest = results[results.length - 1]?.totalMarks || 0;

    // Grade distribution
    const gradeDistribution = results.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {});

    // Class Toppers (top 5)
    const toppers = results.slice(0, 5).map((r, i) => ({
      rank: i + 1,
      student: r.studentId,
      internalTotal: r.internalTotal,
      endSem: r.endSem,
      totalMarks: r.totalMarks,
      grade: r.grade,
      status: r.status,
    }));

    res.json({
      success: true,
      subject,
      results,
      analytics: {
        totalStudents,
        passCount,
        failCount,
        inProgressCount,
        atRiskCount,
        passRate: totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : 0,
        classAverage: parseFloat(classAverage),
        internalAverage: parseFloat(internalAverage),
        ca1Average: parseFloat(ca1Average),
        mseAverage: parseFloat(mseAverage),
        ca2Average: parseFloat(ca2Average),
        endSemAverage: parseFloat(endSemAverage),
        highest,
        lowest,
        gradeDistribution,
        toppers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/results/semester/:semester
 * Admin: All results for a semester
 */
export const getSemesterResults = async (req, res) => {
  try {
    const results = await Result.find({ semester: parseInt(req.params.semester) })
      .populate('studentId', 'name identifier email currentSemester')
      .populate('subjectId', 'subjectName subjectCode credits assessmentConfig')
      .populate('professorId', 'name')
      .sort({ totalMarks: -1 });

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/results/:id
 * Admin only
 */
export const deleteResult = async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
    res.json({ success: true, message: 'Result deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
