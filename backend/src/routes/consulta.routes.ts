import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { consultarDni } from '../controllers/consultaDni.controller';

const router = Router();
router.use(authenticate);
// Solo quien registra personas: administración.
router.get('/dni/:dni', authorize('administrador'), consultarDni);

export default router;
