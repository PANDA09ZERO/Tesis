import { Router } from 'express';
import { getAllSueldos, createSueldo, updateSueldo, getSueldoById, deleteSueldo, getResumenSueldos } from '../controllers/sueldos.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAllSueldos);
router.get('/resumen', getResumenSueldos);
router.get('/:id', getSueldoById);
router.post('/', authorize('administrador'), createSueldo);
router.put('/:id', authorize('administrador'), updateSueldo);
router.delete('/:id', authorize('administrador'), deleteSueldo);

export default router;
