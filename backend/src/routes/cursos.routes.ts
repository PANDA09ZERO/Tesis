import { Router } from 'express';
import { getAllCursos, createCurso, updateCurso, deleteCurso, getCursoById } from '../controllers/cursos.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllCursos);
router.get('/:id', getCursoById);
router.post('/', authorize('administrador'), createCurso);
router.put('/:id', authorize('administrador'), updateCurso);
router.delete('/:id', authorize('administrador'), deleteCurso);

export default router;
