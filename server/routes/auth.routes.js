import express from 'express';
import { register, login, getMe, changePassword } from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', isAuthenticated, getMe);
router.post('/change-password', isAuthenticated, changePassword);

export default router;
