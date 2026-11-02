import { Router } from 'express';
import {
  getAllApoderados,
  getMisAlumnos,
  getApoderadoById,
  createApoderado,
  updateApoderado,
  deleteApoderado,
  asignarAlumno,
  removerAlumno,
  getAlumnosByApoderado
} from '../controllers/apoderados.controller';
import { authenticate, authorize } from '../middleware/auth';
import { getInicioFamilia,getDetalleFamilia } from '../controllers/familia.controller';

const router = Router();

router.use(authenticate);
router.get('/me/alumnos', authorize('apoderado'), getMisAlumnos);
router.get('/me/inicio',authorize('apoderado'),getInicioFamilia);
router.get('/me/alumnos/:alumnoId/resumen',authorize('apoderado'),getDetalleFamilia);
router.use(authorize('administrador'));

router.get('/', getAllApoderados);
router.get('/:id', getApoderadoById);
router.post('/', createApoderado);
router.put('/:id', updateApoderado);
router.delete('/:id', deleteApoderado);

// Gestión de alumnos asignados
router.post('/:id/asignar-alumno', asignarAlumno);
router.delete('/:id/alumnos/:alumnoId', removerAlumno);
router.get('/:id/alumnos', getAlumnosByApoderado);

export default router;
