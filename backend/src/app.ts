import { synchronizePeriodLifecycle } from './utils/periodoVigencia';
import superadministracionRoutes from './routes/superadministracion.routes';
import {operationsGuard,trackRequest} from './utils/operations';
import { limitarApoderado } from './middleware/apoderado';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { applicationSettings } from './config/environment';
import { readiness } from './controllers/health.controller';
import { notFound, errorHandler } from './middleware/errors';

import estudianteRoutes from './routes/estudiante.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import alumnosRoutes from './routes/alumnos.routes';
import profesoresRoutes from './routes/profesores.routes';
import cursosRoutes from './routes/cursos.routes';
import calificacionesRoutes from './routes/calificaciones.routes';
import asistenciasRoutes from './routes/asistencias.routes';
import documentosRoutes from './routes/documentos.routes';
import horariosRoutes from './routes/horarios.routes';
import periodosRoutes from './routes/periodos.routes';
import gradosRoutes from './routes/grados.routes';
import alertasRoutes from './routes/alertas.routes';
import incidenciasRoutes from './routes/incidencias.routes';
import mensualidadesRoutes from './routes/mensualidades.routes';
import sueldosRoutes from './routes/sueldos.routes';
import pagosMatriculaRoutes from './routes/pagosMatricula.routes';
import apoderadosRoutes from './routes/apoderados.routes';
import matriculasRoutes from './routes/matriculas.routes';
import notificacionesRoutes from './routes/notificaciones.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportesRoutes from './routes/reportes.routes';
import seedRoutes from './routes/seed.routes';
import configuracionRoutes from './routes/configuracion.routes';
import evaluacionesRoutes from './routes/evaluaciones.routes';
import { limitarEstudiante } from './middleware/estudiante';
import { authenticate } from './middleware/auth';
import { AuthRequest } from './types';

const app = express();
const config = applicationSettings();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.origins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origen no permitido'), {status:403}));
  },
  credentials: true
}));
if (process.env.NODE_ENV !== 'test') app.use(morgan(':method :status :response-time ms'));
app.use('/api', (_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');next();});
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit:'256kb', parameterLimit:100 }));

app.use('/api', (req, res, next) => {
  const apiPath = req.originalUrl.replace(/^\/api(?=\/|$)/, '').split('?')[0];
  const isPublicAuth = apiPath === '/auth/login';
  const isHealthCheck = ['GET','HEAD'].includes(req.method) && ['/health','/ready'].includes(apiPath);

  if (isHealthCheck) return next();
  if (isPublicAuth) return trackRequest(res,next);

  return authenticate(req as AuthRequest, res, () => {
    return operationsGuard(req as AuthRequest,res,()=>limitarApoderado(req as AuthRequest, res, next));
  });
});

app.use('/api', synchronizePeriodLifecycle);
app.use('/api', limitarEstudiante);

app.use('/api/superadministracion', superadministracionRoutes);
app.use('/api/estudiante', estudianteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/profesores', profesoresRoutes);
app.use('/api/cursos', cursosRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/periodos', periodosRoutes);
app.use('/api/grados', gradosRoutes);
app.use('/api/apoderados', apoderadosRoutes);
app.use('/api/matriculas', matriculasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/mensualidades', mensualidadesRoutes);
app.use('/api/sueldos', sueldosRoutes);
app.use('/api/pagos-matricula', pagosMatriculaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reportesRoutes);
if (!config.production && process.env.ENABLE_DEMO_SEED === 'true') app.use('/api/seed', seedRoutes);
app.use('/api/configuracion-academica', configuracionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ready', readiness);
app.use(notFound);
app.use(errorHandler);

export default app;
