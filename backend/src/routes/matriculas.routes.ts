import { Router } from 'express';
import {
  getAllMatriculas,
  getMatriculaById,
  createMatricula,
  updateMatricula,
  deleteMatricula,
  getMatriculasByPeriodo,
  getEstadisticasMatricula
} from '../controllers/matriculas.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('administrador'));

router.get('/', getAllMatriculas);
router.get('/estadisticas', getEstadisticasMatricula);
router.get('/periodo/:periodoId', getMatriculasByPeriodo);
router.get('/:id', getMatriculaById);

router.post('/', createMatricula);
router.put('/:id', updateMatricula);
router.delete('/:id', deleteMatricula);

export default router;