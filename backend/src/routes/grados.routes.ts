import { Router } from 'express';
import { getAllGrados } from '../controllers/grados.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAllGrados);

export default router;
