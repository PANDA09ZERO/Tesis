// PM2 para la VM de Oracle Cloud.
// En producción el backend NO lee archivos .env (ver backend/src/config/environment.ts),
// así que este archivo lee las variables de /etc/gestion-educativa/backend.env
// y se las pasa al proceso. Los secretos nunca se guardan en el repositorio.
//
// Uso (desde la raíz del repositorio):  pm2 start deploy/oracle/ecosystem.config.cjs
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '../../backend');
const envFile = process.env.GESTION_ENV_FILE || '/etc/gestion-educativa/backend.env';
const dotenv = require(path.join(backend, 'node_modules/dotenv'));
const env = dotenv.parse(fs.readFileSync(envFile));

module.exports = {
  apps: [{
    name: 'gestion-backend',
    cwd: backend,
    script: 'dist/server.js',
    // Una sola instancia: el límite de intentos de login y el panel de
    // operaciones viven en memoria/disco local y no admiten réplicas.
    instances: 1,
    exec_mode: 'fork',
    env: { ...env, NODE_ENV: 'production' },
    max_memory_restart: '700M',
    kill_timeout: 15000,
    time: true,
  }],
};
