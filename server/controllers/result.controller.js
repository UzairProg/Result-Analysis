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
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return null;
  return parsed;
};

/**
 * POST /api/results
 * Professor: Enter/update marks
 */
export const upsertResult = async (req, res) => {
  try {
    const { studentId, subjectId, ca1, mse, ca2, endSem, academicYear, semester } = req.body;

    // Validate professor is assigned to this subject
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    if (req.user.role === 'Professor' && String(subject.assignedProfessor) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject.' });
    }

    // Upsert result
    const result = await Result.findOneAndUpdate(
      { studentId, subjectId, academicYear },
      {
        professorId: req.user._id,
        semester: semester || subject.semester,
        ca1, mse, ca2, endSem,
        // Re-trigger pre-save via explicit save
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Trigger the pre-save hook for computed fields
    await result.save();

    res.status(200).json({ success: true, message: 'Marks saved successfully.', result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/results/bulk
 * Professor: Enter/update bulk marks
 */
export const bulkUpsertResults = async (req, res) => {
  try {
    const { subjectId, results, academicYear, semester } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    if (req.user.role === 'Professor' && String(subject.assignedProfessor) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject.' });
    }

    const rows = Array.isArray(results) ? results : [];
    const targetAcademicYear = academicYear || '2025-26';
    const resolvedOps = [];
    const skippedRows = [];

    for (const row of rows) {
      const prn = normalizeTextValue(row.prn ?? row.PRN);
      if (!prn) {
        skippedRows.push({ reason: 'Missing PRN' });
        continue;
      }

      const student = await User.findOne({ identifier: prn, role: 'Student' }).select('_id identifier');
      if (!student) {
        skippedRows.push({ prn, reason: 'Student not found' });
        continue;
      }

      resolvedOps.push(
        Result.findOneAndUpdate(
          { studentId: student._id, subjectId, academicYear: targetAcademicYear },
          {
            professorId: req.user._id,
            semester: semester || subject.semester,
            ca1: sanitizeMarkValue(row.ca1, 10),
            mse: sanitizeMarkValue(row.mse, 20),
            ca2: sanitizeMarkValue(row.ca2, 10),
            endSem: sanitizeMarkValue(row.endSem, 60),
          },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        )
      );
    }

    if (resolvedOps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid roster rows were provided.',
        skipped: skippedRows,
      });
    }

    const updatedResults = await Promise.all(resolvedOps);

    // Trigger pre-save hook for computed fields
    await Promise.all(updatedResults.map(doc => doc.save()));

    res.status(200).json({
      success: true,
      message: 'Bulk marks saved successfully.',
      count: updatedResults.length,
      skipped: skippedRows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/results/student/:studentId
 * Student/Admin: Get all results for a student
 */
export const getStudentResults = async (req, res) => {
  try {
    // Students can only view their own results
    if (req.user.role === 'Student' && String(req.user._id) !== req.params.studentId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const results = await Result.find({ studentId: req.params.studentId })
      .populate('subjectId', 'subjectName subjectCode credits semester')
      .populate('professorId', 'name')
      .sort({ semester: 1 });

    // Calculate SGPA per semester and CGPA
    const semesterMap = {};
    results.forEach((r) => {
      if (!semesterMap[r.semester]) semesterMap[r.semester] = [];
      semesterMap[r.semester].push(r);
    });

    const sgpaData = Object.entries(semesterMap).map(([sem, res]) => {
      const totalCredits = res.reduce((acc, r) => acc + (r.subjectId?.credits || 0), 0);
      const earnedPoints = res.reduce((acc, r) => acc + (r.gradePoints * (r.subjectId?.credits || 0)), 0);
      const sgpa = totalCredits > 0 ? (earnedPoints / totalCredits).toFixed(2) : 0;
      return { semester: parseInt(sem), sgpa: parseFloat(sgpa), totalCredits };
    });

    const totalCredits = sgpaData.reduce((acc, s) => acc + s.totalCredits, 0);
    const weightedPoints = sgpaData.reduce((acc, s) => acc + (s.sgpa * s.totalCredits), 0);
    const cgpa = totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : 0;

    res.json({ success: true, results, sgpaData, cgpa: parseFloat(cgpa) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/results/class/:subjectId
 * Professor/Admin: Get class results for a subject
 */
export const getClassResults = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { subjectId: req.params.subjectId };
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter)
      .populate('studentId', 'name identifier email currentSemester')
      .populate('subjectId', 'subjectName subjectCode credits semester')
      .sort({ totalMarks: -1 });

    // Class analytics
    const totalStudents = results.length;
    const passCount = results.filter((r) => r.status === 'Passed').length;
    const failCount = results.filter((r) => r.status === 'Failed').length;
    const inProgressCount = results.filter((r) => r.status === 'In-Progress').length;

    const totalMarksSum = results.reduce((acc, r) => acc + r.totalMarks, 0);
    const classAverage = totalStudents > 0 ? (totalMarksSum / totalStudents).toFixed(1) : 0;
    const highest = results[0]?.totalMarks || 0;
    const lowest = results[results.length - 1]?.totalMarks || 0;

    // Grade distribution
    const gradeDistribution = results.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {});

    // Toppers (top 3)
    const toppers = results.slice(0, 3).map((r) => ({
      student: r.studentId,
      totalMarks: r.totalMarks,
      grade: r.grade,
    }));

    res.json({
      success: true,
      results,
      analytics: {
        totalStudents,
        passCount,
        failCount,
        inProgressCount,
        passRate: totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : 0,
        classAverage: parseFloat(classAverage),
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
      .populate('studentId', 'name identifier')
      .populate('subjectId', 'subjectName subjectCode credits')
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
