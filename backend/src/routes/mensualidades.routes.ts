import { Router } from 'express';
import { getAllMensualidades, createMensualidad, updateMensualidad, getMensualidadById, deleteMensualidad, getResumenMensualidades, getAlumnosConDeuda } from '../controllers/mensualidades.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getAllMensualidades);
router.get('/resumen', getResumenMensualidades);
router.get('/alumnos-con-deuda', getAlumnosConDeuda);
router.get('/:id', getMensualidadById);
router.post('/', authorize('administrador'), createMensualidad);
router.put('/:id', authorize('administrador'), updateMensualidad);
router.delete('/:id', authorize('administrador'), deleteMensualidad);

export default router;
