import User from '../models/User.model.js';
import Result from '../models/Result.model.js';

/**
 * GET /api/users
 * Admin: Get all users with filters
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, department, currentSemester, page = 1, limit = 100, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (currentSemester) filter.currentSemester = parseInt(currentSemester);
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { identifier: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('assignedSubjects', 'subjectName subjectCode semester')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, users, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('assignedSubjects', 'subjectName subjectCode semester credits');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/users
 * Admin: Create user
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, identifier, department, currentSemester } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { identifier }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or Identifier already exists.' });
    }

    const user = await User.create({ name, email, password, role, identifier, department, currentSemester });
    res.status(201).json({ success: true, message: 'User created successfully.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/users/:id
 * Admin: Update user
 */
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    Object.keys(req.body).forEach((key) => {
      user[key] = req.body[key];
    });

    await user.save(); // triggers pre-save hook for password

    res.json({ success: true, message: 'User updated successfully.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/users/promote
 * Admin: Bulk promote students from one semester to next
 */
export const bulkPromoteStudents = async (req, res) => {
  try {
    const { fromSemester } = req.body;
    const currentSem = parseInt(fromSemester);
    if (!currentSem || currentSem < 1 || currentSem >= 8) {
      return res.status(400).json({ success: false, message: 'Invalid semester.' });
    }
    
    const result = await User.updateMany(
      { role: 'Student', currentSemester: currentSem },
      { $inc: { currentSemester: 1 } }
    );
    
    res.json({ success: true, message: `Successfully promoted ${result.modifiedCount} students from Sem ${currentSem} to Sem ${currentSem + 1}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/users/:id
 * Admin: Deactivate user (soft delete)
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/users/stats/overview
 * Admin: Dashboard stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [totalStudents, totalProfessors, totalAdmins, totalResults] = await Promise.all([
      User.countDocuments({ role: 'Student', isActive: true }),
      User.countDocuments({ role: 'Professor', isActive: true }),
      User.countDocuments({ role: 'Admin', isActive: true }),
      Result.countDocuments(),
    ]);

    const passCount = await Result.countDocuments({ status: 'Pass' });
    const failCount = await Result.countDocuments({ status: 'Fail' });
    const atRiskCount = await Result.countDocuments({ status: 'At-Risk' });

    // Students per semester
    const semesterData = await User.aggregate([
      { $match: { role: 'Student', isActive: true } },
      { $group: { _id: '$currentSemester', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalProfessors,
        totalAdmins,
        totalResults,
        passCount,
        failCount,
        atRiskCount,
        passRate: totalResults > 0 ? ((passCount / totalResults) * 100).toFixed(1) : 0,
        semesterData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
