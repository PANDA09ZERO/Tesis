import { Router } from 'express';
import { getAllSueldos, createSueldo, updateSueldo, getSueldoById, deleteSueldo, getResumenSueldos } from '../controllers/sueldos.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('administrador'));
router.get('/', getAllSueldos);
router.get('/resumen', getResumenSueldos);
router.get('/:id', getSueldoById);
router.post('/', createSueldo);
router.put('/:id', updateSueldo);
router.delete('/:id', deleteSueldo);

export default router;
