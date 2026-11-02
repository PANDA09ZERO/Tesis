import { Router } from 'express';
import {
  getAllNotificaciones,
  getNotificacionById,
  createNotificacion,
  marcarLeida,
  marcarTodasLeidas,
  deleteNotificacion,
  getNotificacionesNoLeidas,
  enviarNotificacionMasiva
} from '../controllers/notificaciones.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllNotificaciones);
router.get('/no-leidas', getNotificacionesNoLeidas);
router.get('/:id', getNotificacionById);

// Rutas protegidas
router.post('/', authenticate, authorize('administrador'), createNotificacion);
router.post('/masiva', authenticate, authorize('administrador'), enviarNotificacionMasiva);
router.put('/:id/marcar-leida', marcarLeida);
router.put('/marcar-todas-leidas', marcarTodasLeidas);
router.delete('/:id', deleteNotificacion);

export default router;