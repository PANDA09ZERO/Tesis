import { Router } from 'express';
import { getAllAlertas, updateAlertaEstado, asignarAlerta, getAlertasEstadisticas, evaluarAlertasAhora, getCriteriosAlertas } from '../controllers/alertas.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllAlertas);
router.get('/estadisticas', getAlertasEstadisticas);
router.get('/criterios', authorize('administrador','profesor'), getCriteriosAlertas);
router.post('/evaluar', authorize('administrador'), evaluarAlertasAhora);
router.put('/:id/estado', authorize('administrador','profesor'), updateAlertaEstado);
router.put('/:id/asignar', authorize('administrador'), asignarAlerta);

export default router;
