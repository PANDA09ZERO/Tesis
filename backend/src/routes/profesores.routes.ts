import { getMiPerfil,getMiResumen } from '../controllers/profesorPersonal.controller';
import { Router } from 'express';
import { getAllProfesores, getProfesorById, createProfesor, updateProfesor, deleteProfesor, getProfesorAlumnos, getProfesorCursos, getMisApoderados } from '../controllers/profesores.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('administrador'), getAllProfesores);
router.get('/me/perfil', authorize('profesor'), getMiPerfil);
router.get('/me/resumen', authorize('profesor'), getMiResumen);
router.get('/me/apoderados', authorize('profesor'), getMisApoderados);
router.get('/:id', authorize('administrador'), getProfesorById);
router.post('/', authorize('administrador'), createProfesor);
router.put('/:id', authorize('administrador'), updateProfesor);
router.delete('/:id', authorize('administrador'), deleteProfesor);
router.get('/:id/alumnos', authorize('administrador'), getProfesorAlumnos);
router.get('/:id/cursos', authorize('administrador'), getProfesorCursos);

export default router;
