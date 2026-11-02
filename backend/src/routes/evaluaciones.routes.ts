import { Router } from 'express';
import { createEvaluacionOferta, getEvaluacionesOferta } from '../controllers/evaluaciones.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('administrador', 'profesor'));
router.get('/oferta/:ofertaId', getEvaluacionesOferta);
router.post('/oferta/:ofertaId', createEvaluacionOferta);

export default router;