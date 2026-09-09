import { Router } from 'express';
import { getAllHorarios, createHorario, updateHorario, deleteHorario } from '../controllers/horarios.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllHorarios);
router.post('/', authorize('administrador'), createHorario);
router.put('/:id', authorize('administrador'), updateHorario);
router.delete('/:id', authorize('administrador'), deleteHorario);

export default router;
