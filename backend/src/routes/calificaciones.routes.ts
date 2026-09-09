import { Router } from 'express';
import { getCalificacionesByAlumno, getCalificacionesByCurso, registerCalificacion, updateCalificacion, bulkRegisterCalificaciones } from '../controllers/calificaciones.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/alumno/:alumno_id', getCalificacionesByAlumno);
router.get('/curso/:curso_id', authorize('administrador', 'profesor'), getCalificacionesByCurso);
router.post('/', authorize('administrador', 'profesor'), registerCalificacion);
router.put('/:id', authorize('administrador', 'profesor'), updateCalificacion);
router.post('/bulk', authorize('administrador', 'profesor'), bulkRegisterCalificaciones);

export default router;
