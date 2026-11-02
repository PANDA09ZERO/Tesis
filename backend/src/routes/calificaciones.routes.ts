import { Router } from 'express';
import { getCalificacionesByAlumno, getCalificacionesByCurso, getAlumnosByCurso, registerCalificacion, updateCalificacion, bulkRegisterCalificaciones, getLibroCalificacionesOferta, bulkRegisterCalificacionesOferta } from '../controllers/calificaciones.controller';
import { authenticate, authorize } from '../middleware/auth';
import { authorizeLinkedAlumno } from '../middleware/linkedAlumno';

const router = Router();

router.use(authenticate);

router.get('/alumno/:alumno_id', authorizeLinkedAlumno('alumno_id'), getCalificacionesByAlumno);
router.get('/oferta/:ofertaId/libro', authorize('administrador', 'profesor'), getLibroCalificacionesOferta);
router.post('/oferta/:ofertaId/evaluacion/:evaluacionId/bulk', authorize('administrador', 'profesor'), bulkRegisterCalificacionesOferta);
router.get('/curso/:curso_id/alumnos', authorize('administrador', 'profesor'), getAlumnosByCurso);
router.get('/curso/:curso_id', authorize('administrador', 'profesor'), getCalificacionesByCurso);
router.post('/', authorize('administrador', 'profesor'), registerCalificacion);
router.put('/:id', authorize('administrador', 'profesor'), updateCalificacion);
router.post('/bulk', authorize('administrador', 'profesor'), bulkRegisterCalificaciones);

export default router;
