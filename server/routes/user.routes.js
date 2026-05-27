import express from 'express';
import {
  getAllUsers, getUserById, createUser, updateUser, deleteUser, getDashboardStats, bulkPromoteStudents
} from '../controllers/user.controller.js';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware.js';

const router = express.Router();

// All user routes require authentication
router.use(isAuthenticated);

router.get('/stats/overview', isAuthorized('Admin'), getDashboardStats);
router.get('/', isAuthorized('Admin', 'Professor'), getAllUsers);
router.get('/:id', isAuthorized('Admin', 'Professor', 'Student'), getUserById);
router.post('/', isAuthorized('Admin'), createUser);
router.put('/promote', isAuthorized('Admin'), bulkPromoteStudents);
router.put('/:id', isAuthorized('Admin'), updateUser);
router.delete('/:id', isAuthorized('Admin'), deleteUser);

export default router;
