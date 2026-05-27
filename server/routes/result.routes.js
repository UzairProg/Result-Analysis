import express from 'express';
import {
  upsertResult, bulkUpsertResults, getStudentResults, getClassResults, getSemesterResults, deleteResult
} from '../controllers/result.controller.js';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(isAuthenticated);

router.post('/', isAuthorized('Admin', 'Professor'), upsertResult);
router.put('/bulk', isAuthorized('Admin', 'Professor'), bulkUpsertResults);
router.get('/student/:studentId', getStudentResults);
router.get('/class/:subjectId', isAuthorized('Admin', 'Professor'), getClassResults);
router.get('/semester/:semester', isAuthorized('Admin'), getSemesterResults);
router.delete('/:id', isAuthorized('Admin'), deleteResult);

export default router;
