import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { isIP } from 'net';

// Los secretos del proveedor tienen prioridad; producción nunca carga archivos locales.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

type Environment = NodeJS.ProcessEnv;
export function integerSetting(env: Environment, key: string, fallback: number, min = 1, max = 1000000) {
  const raw = env[key];
  const value = raw === undefined ? fallback : Number(raw);
  if ((raw !== undefined && !/^\d+$/.test(raw)) || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Configuración inválida: ${key}`);
  return value;
}
export function uploadDirectory(env: Environment = process.env) {
  if (env.UPLOAD_DIRECTORY && !path.isAbsolute(env.UPLOAD_DIRECTORY)) throw new Error('UPLOAD_DIRECTORY debe ser una ruta absoluta');
  if (env.NODE_ENV === 'production' && !env.UPLOAD_DIRECTORY) throw new Error('UPLOAD_DIRECTORY es obligatorio en producción');
  return env.UPLOAD_DIRECTORY || path.resolve(__dirname, '../../uploads');
}
export function institutionalEmailDomain(env: Environment = process.env) {
  const domain = (env.INSTITUTIONAL_EMAIL_DOMAIN || 'cienciaseingenieria.edu').trim().toLowerCase();
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new Error('INSTITUTIONAL_EMAIL_DOMAIN debe ser un dominio válido, sin @');
  }
  return domain;
}
export function applicationSettings(env: Environment = process.env) {
  if(env.NODE_ENV && !['development','test','production'].includes(env.NODE_ENV))throw new Error('NODE_ENV inválido');
  const production = env.NODE_ENV === 'production';
  const origins = (env.CORS_ORIGINS || (production ? '' : 'http://localhost:5173,http://localhost:3001')).split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => { try { const url = new URL(origin); return url.origin !== origin || url.username || url.password || (production && url.protocol !== 'https:') || !['http:','https:'].includes(url.protocol); } catch { return true; } })) throw new Error('CORS_ORIGINS debe contener orígenes exactos válidos');
  if (production && (!env.JWT_SECRET || env.JWT_SECRET.length < 48 || /changeme|cambiar|example|demo|test|your.secret/i.test(env.JWT_SECRET))) throw new Error('JWT_SECRET debe ser aleatorio y de al menos 48 caracteres en producción');
  const trustProxy = env.TRUST_PROXY?.trim() || '';
  const proxies=trustProxy?trustProxy.split(',').map(value=>value.trim()):[];
  if(proxies.some(value=>{
    if(/^(true|false|\d+|\*|0\.0\.0\.0\/0|::\/0)$/i.test(value)||!value)return true;
    if(['loopback','linklocal','uniquelocal'].includes(value))return false;
    const [ip,bits,...extra]=value.split('/'),family=isIP(ip);
    return !family||extra.length>0||(bits!==undefined&&(!/^\d+$/.test(bits)||Number(bits)<1||Number(bits)>(family===4?32:128)));
  }))throw new Error('TRUST_PROXY debe identificar proxies/redes confiables, no todos los clientes');
  if (production && env.ALLOW_LEGACY_PASSWORDS === 'true') throw new Error('Las contraseñas legacy no están permitidas en producción');
  return {production, origins, trustProxy: proxies.length ? proxies : false as false,
    institutionalEmailDomain: institutionalEmailDomain(env),
    port: integerSetting(env,'PORT',3000,0,65535), uploadDirectory: uploadDirectory(env),
    requestTimeout: integerSetting(env,'REQUEST_TIMEOUT_MS',120000),
    readinessTimeout: integerSetting(env,'READINESS_TIMEOUT_MS',3000),
    maxUploadBytes: integerSetting(env,'MAX_UPLOAD_BYTES',10*1024*1024,1,100*1024*1024)};
}
export function databaseSettings(env: Environment = process.env) {
  const production = env.NODE_ENV === 'production';
  if (production && (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || env.DB_USER.toLowerCase() === 'root' || !env.DB_PASSWORD)) throw new Error('MySQL de producción requiere host, base, usuario limitado y contraseña');
  if (env.DB_SSL !== undefined && !['true','false'].includes(env.DB_SSL)) throw new Error('DB_SSL debe ser true o false');
  return {host:env.DB_HOST || 'localhost',port:integerSetting(env,'DB_PORT',3306,1,65535),user:env.DB_USER || 'root',password:env.DB_PASSWORD || '',database:env.DB_NAME || 'gestion_educativa',
    waitForConnections:true, connectionLimit:integerSetting(env,'DB_CONNECTION_LIMIT',10,1,100),queueLimit:integerSetting(env,'DB_QUEUE_LIMIT',100,1,10000),connectTimeout:integerSetting(env,'DB_CONNECT_TIMEOUT_MS',10000),
    timezone:'Z',charset:'utf8mb4',
    ...(env.DB_SSL === 'true' ? {ssl:{rejectUnauthorized:true,minVersion:'TLSv1.2' as const,...(env.DB_SSL_CA_FILE ? {ca:fs.readFileSync(env.DB_SSL_CA_FILE,'utf8')} : {})}} : {})};
}
