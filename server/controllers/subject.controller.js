import Subject from '../models/Subject.model.js';
import User from '../models/User.model.js';

/**
 * GET /api/subjects
 */
export const getAllSubjects = async (req, res) => {
  try {
    const { semester, department } = req.query;
    const filter = {};
    if (semester) filter.semester = parseInt(semester);
    if (department) filter.department = department;

    const subjects = await Subject.find(filter)
      .populate('assignedProfessor', 'name email identifier')
      .sort({ semester: 1, subjectCode: 1 });

    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/subjects/:id
 */
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('assignedProfessor', 'name email identifier');

    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/subjects
 * Admin only
 */
export const createSubject = async (req, res) => {
  try {
    const { subjectName, subjectCode, credits, semester, department, assignedProfessor } = req.body;

    const existing = await Subject.findOne({ subjectCode });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Subject code already exists.' });
    }

    const subject = await Subject.create({ subjectName, subjectCode, credits, semester, department, assignedProfessor });

    // Update professor's assignedSubjects
    if (assignedProfessor) {
      await User.findByIdAndUpdate(
        assignedProfessor,
        { $addToSet: { assignedSubjects: subject._id } }
      );
    }

    res.status(201).json({ success: true, message: 'Subject created.', subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/subjects/:id
 * Admin only
 */
export const updateSubject = async (req, res) => {
  try {
    const old = await Subject.findById(req.params.id);
    if (!old) return res.status(404).json({ success: false, message: 'Subject not found.' });

    // Update professor assignment
    if (req.body.assignedProfessor && req.body.assignedProfessor !== String(old.assignedProfessor)) {
      // Remove from old professor
      if (old.assignedProfessor) {
        await User.findByIdAndUpdate(old.assignedProfessor, { $pull: { assignedSubjects: old._id } });
      }
      // Add to new professor
      await User.findByIdAndUpdate(req.body.assignedProfessor, { $addToSet: { assignedSubjects: old._id } });
    }

    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedProfessor', 'name email');

    res.json({ success: true, message: 'Subject updated.', subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/subjects/:id
 * Admin only
 */
export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, message: 'Subject deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/subjects/professor/my-subjects
 * Professor: Get their assigned subjects
 */
export const getProfessorSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ assignedProfessor: req.user._id, isActive: true })
      .sort({ semester: 1 });
    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
