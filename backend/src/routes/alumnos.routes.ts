import { Router } from 'express';
import { getAllAlumnos, getAlumnoById, createAlumno, updateAlumno, getAlumnoHorario } from '../controllers/alumnos.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('administrador', 'profesor'), getAllAlumnos);
router.get('/:id', getAlumnoById);
router.post('/', authorize('administrador'), createAlumno);
router.put('/:id', authorize('administrador'), updateAlumno);
router.get('/:id/horario', getAlumnoHorario);

export default router;
