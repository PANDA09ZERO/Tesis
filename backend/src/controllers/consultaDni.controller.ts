import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Consulta de DNI (RENIEC) mediante un proveedor externo, como al emitir boletas.
 * Proveedor por defecto: Decolecta (https://decolecta.com). Configura en .env:
 *   DNI_API_TOKEN=<tu token>
 *   DNI_API_URL=https://api.decolecta.com/v1/reniec/dni   (opcional)
 * El token nunca llega al navegador: el frontend solo llama a /api/consulta/dni/:dni.
 */
const API_URL = () => process.env.DNI_API_URL || 'https://api.decolecta.com/v1/reniec/dni';
const TIMEOUT_MS = 8000;
const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: PersonaDni }>();

interface PersonaDni { dni: string; nombre: string; apellido: string; apellido_paterno: string; apellido_materno: string }

const titulo = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep, c) => sep + c.toUpperCase()).trim();
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Acepta el formato de Decolecta y el de apis.net.pe / apiperu.dev. */
export function normalizarPersona(dni: string, raw: any): PersonaDni | null {
  const d = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
  const nombres = str(d?.first_name) || str(d?.nombres);
  const paterno = str(d?.first_last_name) || str(d?.apellidoPaterno) || str(d?.apellido_paterno);
  const materno = str(d?.second_last_name) || str(d?.apellidoMaterno) || str(d?.apellido_materno);
  if (!nombres || !paterno) return null;
  return {
    dni,
    nombre: titulo(nombres),
    apellido: titulo(`${paterno} ${materno}`),
    apellido_paterno: titulo(paterno),
    apellido_materno: titulo(materno),
  };
}

export const consultarDni = async (req: AuthRequest, res: Response) => {
  const dni = String(req.params.dni || '').trim();
  if (!/^\d{8}$/.test(dni)) return sendError(res, 'El DNI debe tener 8 dígitos.', 400);

  const [existe] = await pool.query<RowDataPacket[]>(
    'SELECT id, nombre, apellido FROM usuarios WHERE dni = ? LIMIT 1', [dni]);
  const registrado = existe.length ? { id: existe[0].id, nombre: `${existe[0].nombre} ${existe[0].apellido}` } : null;

  const hit = cache.get(dni);
  if (hit && Date.now() - hit.at < CACHE_MS) return sendSuccess(res, { ...hit.data, registrado });

  const token = process.env.DNI_API_TOKEN;
  if (!token) return sendError(res, 'La consulta de DNI no está configurada (falta DNI_API_TOKEN). Llena los datos a mano.', 503);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${API_URL()}?numero=${dni}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: ctrl.signal });
    if (r.status === 404 || r.status === 422) return sendError(res, 'No se encontró ese DNI en RENIEC.', 404);
    if (r.status === 401 || r.status === 403) return sendError(res, 'El token de consulta de DNI no es válido o se agotó el plan.', 502);
    if (r.status === 429) return sendError(res, 'Se alcanzó el límite de consultas de DNI. Intenta en un momento.', 429);
    if (!r.ok) return sendError(res, 'El servicio de consulta de DNI no respondió. Llena los datos a mano.', 502);
    const persona = normalizarPersona(dni, await r.json());
    if (!persona) return sendError(res, 'No se encontró ese DNI en RENIEC.', 404);
    cache.set(dni, { at: Date.now(), data: persona });
    if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
    return sendSuccess(res, { ...persona, registrado });
  } catch {
    return sendError(res, 'El servicio de consulta de DNI no respondió. Llena los datos a mano.', 502);
  } finally {
    clearTimeout(timer);
  }
};
