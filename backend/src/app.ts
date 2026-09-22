import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

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
import mensualidadesRoutes from './routes/mensualidades.routes';
import sueldosRoutes from './routes/sueldos.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportesRoutes from './routes/reportes.routes';
import aiRoutes from './routes/ai.routes';
import seedRoutes from './routes/seed.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/profesores', profesoresRoutes);
app.use('/api/cursos', cursosRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/periodos', periodosRoutes);
app.use('/api/grados', gradosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/mensualidades', mensualidadesRoutes);
app.use('/api/sueldos', sueldosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/seed', seedRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});

export default app;