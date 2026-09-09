import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

router.use(authenticate);

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/api/ai/health`);
    res.json(data);
  } catch (error) {
    res.json({ status: 'offline', message: 'El servicio de IA no está disponible' });
  }
});

router.get('/predict/:alumnoId', async (req: Request, res: Response) => {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/api/ai/predict/${req.params.alumnoId}`);
    res.json(data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      sendError(res, 'Error al conectar con el servicio de IA. Asegúrate de que esté ejecutándose en el puerto 5000', 503);
    }
  }
});

router.post('/predict-batch', async (req: Request, res: Response) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/api/ai/predict-batch`, req.body);
    res.json(data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      sendError(res, 'Error al conectar con el servicio de IA', 503);
    }
  }
});

router.post('/analyze-all', async (_req: Request, res: Response) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/api/ai/analyze-all`);
    res.json(data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      sendError(res, 'Error al conectar con el servicio de IA', 503);
    }
  }
});

router.post('/train', async (_req: Request, res: Response) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/api/ai/train`);
    res.json(data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      sendError(res, 'Error al conectar con el servicio de IA', 503);
    }
  }
});

export default router;