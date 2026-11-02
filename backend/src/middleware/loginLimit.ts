import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { sendError } from '../utils/response';
export function createLoginLimiter(options: {windowMs?:number; accountLimit?:number; ipLimit?:number; now?:()=>number} = {}) {
  const positive = (value: unknown, fallback: number) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const windowMs = positive(options.windowMs ?? process.env.LOGIN_WINDOW_MS, 900000);
  const accountLimit = positive(options.accountLimit ?? process.env.LOGIN_ACCOUNT_LIMIT, 20);
  const ipLimit = positive(options.ipLimit ?? process.env.LOGIN_IP_LIMIT, 100);
  const now = options.now || Date.now;
  const attempts = new Map<string, {count:number; expires:number}>();
  return (req: Request, res: Response, next: NextFunction) => {
    const time = now();
    for (const [key, entry] of attempts) if (entry.expires <= time) attempts.delete(key);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const keys = [[ip, ipLimit], [ip+':'+createHash('sha256').update(email).digest('hex'), accountLimit]] as const;
    for (const [key, limit] of keys) {
      const entry = attempts.get(key);
      if ((entry && entry.count >= limit) || (!entry && attempts.size >= 10000)) {
        res.setHeader('Retry-After', String(Math.ceil(((entry?.expires ?? time+windowMs)-time)/1000)));
        return sendError(res, 'Demasiados intentos. Espere antes de volver a iniciar sesión', 429);
      }
    }
    for (const [key] of keys) { const entry = attempts.get(key) || {count:0,expires:time+windowMs}; entry.count++; attempts.set(key,entry); }
    next();
  };
}
