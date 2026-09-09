import { Router } from 'express';
import { reporteRendimientoGeneral, reporteAsistencia, reporteAlumnosEnRiesgo, reporteDocumentos } from '../controllers/reportes.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('administrador', 'profesor'));

router.get('/rendimiento', reporteRendimientoGeneral);
router.get('/asistencia', reporteAsistencia);
router.get('/alumnos-riesgo', reporteAlumnosEnRiesgo);
router.get('/documentos', reporteDocumentos);

export default router;
