import { Router } from 'express';
import { getAsistenciasByAlumno, getAsistenciasByCurso, registerAsistencia, bulkRegisterAsistencias, getResumenAsistenciaGrado, getAsistenciasOferta, getHistorialAsistenciasOferta, bulkRegisterAsistenciasOferta } from '../controllers/asistencias.controller';
import { authenticate, authorize } from '../middleware/auth';
import { authorizeLinkedAlumno } from '../middleware/linkedAlumno';

const router = Router();

router.use(authenticate);

router.get('/alumno/:alumno_id', authorizeLinkedAlumno('alumno_id'), getAsistenciasByAlumno);
router.get('/oferta/:ofertaId/historial', authorize('administrador', 'profesor'), getHistorialAsistenciasOferta);
router.get('/oferta/:ofertaId', authorize('administrador', 'profesor'), getAsistenciasOferta);
router.post('/oferta/:ofertaId/bulk', authorize('administrador', 'profesor'), bulkRegisterAsistenciasOferta);
router.get('/curso/:curso_id', authorize('administrador', 'profesor'), getAsistenciasByCurso);
router.get('/resumen-grado', authorize('administrador', 'profesor'), getResumenAsistenciaGrado);
router.post('/', authorize('administrador', 'profesor'), registerAsistencia);
router.post('/bulk', authorize('administrador', 'profesor'), bulkRegisterAsistencias);

export default router;
