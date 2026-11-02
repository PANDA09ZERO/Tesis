import { getDetallePeriodo } from '../controllers/periodoDetalle.controller';
import { Router } from 'express';
import { getAllPeriodos, createPeriodo, updatePeriodo, deletePeriodo } from '../controllers/periodos.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('administrador', 'profesor'), getAllPeriodos);
router.get('/:id', authorize('administrador', 'profesor'), getDetallePeriodo);
router.post('/', authorize('administrador'), createPeriodo);
router.put('/:id', authorize('administrador'), updatePeriodo);
router.delete('/:id', authorize('administrador'), deletePeriodo);

export default router;
