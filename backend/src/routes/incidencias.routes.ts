import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { authorizeLinkedAlumno } from '../middleware/linkedAlumno';
import { getIncidencias, getIncidenciasEstadisticas, getIncidenciasAlumno, createIncidencia, updateIncidencia, updateEstadoIncidencia } from '../controllers/incidencias.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('administrador', 'profesor'), getIncidencias);
router.get('/estadisticas', authorize('administrador', 'profesor'), getIncidenciasEstadisticas);
router.get('/alumno/:alumnoId', authorize('administrador', 'profesor', 'apoderado'), authorizeLinkedAlumno('alumnoId'), getIncidenciasAlumno);
router.post('/', authorize('administrador', 'profesor'), createIncidencia);
router.put('/:id', authorize('administrador', 'profesor'), updateIncidencia);
router.put('/:id/estado', authorize('administrador'), updateEstadoIncidencia);

export default router;
