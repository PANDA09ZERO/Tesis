import { Router } from 'express';
import {
  getEstructuraPeriodo,
  getCursosDeGrado,
  addGradosPeriodo,
  removeGradoPeriodo,
  addCursosGrado,
  removeCursoGrado,
  addProfesoresCurso,
  removeProfesorCurso,
  clonarConfiguracionPeriodo,
  getOfertas,
  getOfertaById
} from '../controllers/configuracion.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Consulta de la estructura (administrador y profesor)
router.get('/periodos/:periodoId', authorize('administrador', 'profesor'), getEstructuraPeriodo);
router.get('/periodos/:periodoId/grados/:gradoId/cursos', authorize('administrador', 'profesor'), getCursosDeGrado);
router.get('/ofertas', authorize('administrador', 'profesor'), getOfertas);
router.get('/ofertas/:ofertaId', authorize('administrador', 'profesor'), getOfertaById);

// Configuración (solo administrador)
router.use(authorize('administrador'));

router.post('/periodos/:periodoId/grados', addGradosPeriodo);
router.delete('/periodos/:periodoId/grados/:gradoId', removeGradoPeriodo);
router.post('/periodos/:periodoId/grados/:gradoId/cursos', addCursosGrado);
router.delete('/cursos/:pgcId', removeCursoGrado);
router.post('/cursos/:pgcId/profesores', addProfesoresCurso);
router.delete('/cursos/:pgcId/profesores/:profesorId', removeProfesorCurso);
router.post('/periodos/:destinoId/clonar', clonarConfiguracionPeriodo);

export default router;
