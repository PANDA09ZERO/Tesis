import { getLibretaRules, saveLibretaRules, getCalculatedLibreta, emitLibreta, getIssuedLibreta } from '../controllers/libretas.controller';
import { getExpedienteAlumno } from '../controllers/expediente.controller';
import { Router } from 'express';
import { getAllAlumnos, getAlumnoById, createAlumno, updateAlumno, getAlumnoHorario, getAlumnoMatriculas } from '../controllers/alumnos.controller';
import { authenticate, authorize } from '../middleware/auth';
import { authorizeLinkedAlumno } from '../middleware/linkedAlumno';

const router = Router();

router.use(authenticate);

router.get('/', authorize('administrador', 'profesor'), getAllAlumnos);
router.get('/libreta/reglas/:periodoId/:gradoId', authorize('administrador'), getLibretaRules);
router.put('/libreta/reglas/:periodoId/:gradoId', authorize('administrador'), saveLibretaRules);
router.get('/:id/libretas/emisiones/:emisionId', authorize('administrador'), getIssuedLibreta);
router.get('/:id/libretas/:periodoId/:gradoId', authorize('administrador'), getCalculatedLibreta);
router.post('/:id/libretas/:periodoId/:gradoId', authorize('administrador'), emitLibreta);
router.get('/:id/expediente', authorize('administrador'), getExpedienteAlumno);
router.get('/:id', authorizeLinkedAlumno('id'), getAlumnoById);
router.get('/:id/matriculas', authorizeLinkedAlumno('id'), getAlumnoMatriculas);
router.post('/', authorize('administrador'), createAlumno);
router.put('/:id', authorize('administrador'), updateAlumno);
router.get('/:id/horario', authorizeLinkedAlumno('id'), getAlumnoHorario);

export default router;
