import { Router } from 'express';
import { getAllPeriodos, createPeriodo, updatePeriodo, deletePeriodo } from '../controllers/periodos.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('administrador'));

router.get('/', getAllPeriodos);
router.post('/', createPeriodo);
router.put('/:id', updatePeriodo);
router.delete('/:id', deletePeriodo);

export default router;
