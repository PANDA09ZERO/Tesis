import { Router } from 'express';
import { login, register, getProfile, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
