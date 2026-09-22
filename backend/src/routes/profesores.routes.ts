import { Router } from 'express';
import { getAllProfesores, getProfesorById, createProfesor, updateProfesor, getProfesorAlumnos, getProfesorCursos } from '../controllers/profesores.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('administrador'), getAllProfesores);
router.get('/:id', getProfesorById);
router.post('/', authorize('administrador'), createProfesor);
router.put('/:id', authorize('administrador', 'profesor'), updateProfesor);
router.get('/:id/alumnos', getProfesorAlumnos);
router.get('/:id/cursos', getProfesorCursos);

export default router;
