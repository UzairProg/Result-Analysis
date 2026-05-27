import express from 'express';
import {
  getAllSubjects, getSubjectById, createSubject, updateSubject, deleteSubject, getProfessorSubjects
} from '../controllers/subject.controller.js';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(isAuthenticated);

router.get('/professor/my-subjects', isAuthorized('Professor'), getProfessorSubjects);
router.get('/', getAllSubjects);
router.get('/:id', getAllSubjects);
router.post('/', isAuthorized('Admin'), createSubject);
router.put('/:id', isAuthorized('Admin'), updateSubject);
router.delete('/:id', isAuthorized('Admin'), deleteSubject);

export default router;
