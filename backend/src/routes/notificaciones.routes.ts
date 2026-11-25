import { Router } from 'express';
import {
  getAllNotificaciones,
  getNotificacionById,
  createNotificacion,
  marcarLeida,
  marcarTodasLeidas,
  deleteNotificacion,
  getNotificacionesNoLeidas,
  enviarNotificacionMasiva,
  getRespuestas,
  createRespuesta
} from '../controllers/notificaciones.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllNotificaciones);
router.get('/no-leidas', getNotificacionesNoLeidas);
router.get('/:id', getNotificacionById);
router.get('/:id/respuestas', getRespuestas);
// Responden el destinatario y la administración; el controlador verifica el acceso.
router.post('/:id/respuestas', createRespuesta);

// Rutas protegidas
router.post('/', authenticate, authorize('administrador'), createNotificacion);
router.post('/masiva', authenticate, authorize('administrador'), enviarNotificacionMasiva);
router.put('/:id/marcar-leida', marcarLeida);
router.put('/marcar-todas-leidas', marcarTodasLeidas);
router.delete('/:id', deleteNotificacion);

export default router;