import { Router } from 'express';
import { getDashboardStats, getRendimientoPorGrado, getAsistenciaReciente, getActividadReciente } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/rendimiento', getRendimientoPorGrado);
router.get('/asistencia-reciente', getAsistenciaReciente);
router.get('/actividad-reciente', getActividadReciente);

export default router;
