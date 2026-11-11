import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listarTramites, crearTramite, actualizarTramite } from '../controllers/tramites.controller';

const router = Router();
router.use(authenticate, authorize('administrador'));
router.get('/', listarTramites);
router.post('/', crearTramite);
router.put('/:id', actualizarTramite);

export default router;
