import { Router } from 'express';
import {
  getAllHorarios,
  getCalendarEvents,
  createHorario,
  updateHorario,
  deleteHorario,
  createEventoCalendario,
  deleteEventoCalendario
} from '../controllers/horarios.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/calendario', getCalendarEvents);
router.post('/calendario', authorize('administrador', 'profesor'), createEventoCalendario);
router.delete('/calendario/:id', authorize('administrador', 'profesor'), deleteEventoCalendario);
router.get('/', getAllHorarios);
router.post('/', authorize('administrador'), createHorario);
router.put('/:id', authorize('administrador'), updateHorario);
router.delete('/:id', authorize('administrador'), deleteHorario);

export default router;
