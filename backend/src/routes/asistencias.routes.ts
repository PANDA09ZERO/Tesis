import { Router } from 'express';
import { getAsistenciasByAlumno, getAsistenciasByCurso, registerAsistencia, bulkRegisterAsistencias, getResumenAsistenciaGrado } from '../controllers/asistencias.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/alumno/:alumno_id', getAsistenciasByAlumno);
router.get('/curso/:curso_id', authorize('administrador', 'profesor'), getAsistenciasByCurso);
router.get('/resumen-grado', authorize('administrador', 'profesor'), getResumenAsistenciaGrado);
router.post('/', authorize('administrador', 'profesor'), registerAsistencia);
router.post('/bulk', authorize('administrador', 'profesor'), bulkRegisterAsistencias);

export default router;
