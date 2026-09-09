import { Router } from 'express';
import { getAllAlertas, updateAlertaEstado, asignarAlerta, getAlertasEstadisticas } from '../controllers/alertas.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllAlertas);
router.get('/estadisticas', getAlertasEstadisticas);
router.put('/:id/estado', updateAlertaEstado);
router.put('/:id/asignar', authorize('administrador'), asignarAlerta);

export default router;
