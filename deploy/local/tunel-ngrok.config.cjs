// PM2: túnel de ngrok que publica el backend local (puerto 3000) con el dominio fijo gratuito.
// Reemplaza a Tailscale Funnel, que no conecta en las redes de esta PC (ver docs/despliegue-local-tailscale.md).
// Requiere haber guardado el token una vez:  ngrok config add-authtoken <TOKEN>
// Uso (desde la raíz del repositorio):  pm2 start deploy/local/tunel-ngrok.config.cjs
const path = require('node:path');

const dominio = process.env.NGROK_URL || 'https://estrogen-wildcard-molecule.ngrok-free.dev';
const ngrok = process.env.NGROK_BIN || path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ngrok.exe');

module.exports = {
  apps: [{
    name: 'gestion-tunel',
    script: ngrok,
    // 127.0.0.1 y no "3000" (localhost): ngrok probaba primero IPv6 (::1) y el backend solo escucha en IPv4.
    args: ['http', `--url=${dominio}`, '--log=stdout', 'http://127.0.0.1:3000'],
    interpreter: 'none',
    autorestart: true,
    restart_delay: 5000,
    time: true,
  }],
};
