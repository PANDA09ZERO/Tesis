import { Router } from 'express';
import { getAllGrados } from '../controllers/grados.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', authorize('administrador','profesor'), getAllGrados);

export default router;
