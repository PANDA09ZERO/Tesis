import { createLoginLimiter } from '../middleware/loginLimit';
import { Router } from 'express';
import { login, register, getProfile, updatePersonalProfile, changePassword } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login', createLoginLimiter(), login);
router.post('/register', authenticate, authorize('administrador'), register);
router.get('/profile', authenticate, getProfile);
router.put('/profile/personal', authenticate, updatePersonalProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
