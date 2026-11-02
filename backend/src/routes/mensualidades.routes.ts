import { Router } from 'express';
import { getAllMensualidades, createMensualidad, updateMensualidad, getMensualidadById, deleteMensualidad, getResumenMensualidades, getAlumnosConDeuda } from '../controllers/mensualidades.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('administrador'));
router.get('/', getAllMensualidades);
router.get('/resumen', getResumenMensualidades);
router.get('/alumnos-con-deuda', getAlumnosConDeuda);
router.get('/:id', getMensualidadById);
router.post('/', createMensualidad);
router.put('/:id', updateMensualidad);
router.delete('/:id', deleteMensualidad);

export default router;
