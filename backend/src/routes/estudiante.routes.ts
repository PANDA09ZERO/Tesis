import {Router} from 'express';
import {authenticate,authorize} from '../middleware/auth';
import {getContextoEstudiante,getPeriodoEstudiante,getCursoEstudiante} from '../controllers/estudiante.controller';
const router = Router();
router.use(authenticate,authorize('alumno'));
router.get('/contexto',getContextoEstudiante);
router.get('/periodo',getPeriodoEstudiante);
router.get('/cursos/:matriculaId',getCursoEstudiante);
export default router;
