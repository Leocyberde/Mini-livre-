import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { pool } from './db';

const JWT_SECRET = process.env.SESSION_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set. Server cannot start without a secure JWT secret.');
}
const JWT_EXPIRES_IN = '24h';
const JWT_EXPIRES_SECONDS = 24 * 60 * 60;

export interface JwtPayload {
  id: string;
  email: string;
  roles: string[];
  jti?: string;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  const jti = nanoid();
  return jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function revokeToken(jti: string): Promise<void> {
  const expiresAt = new Date(Date.now() + JWT_EXPIRES_SECONDS * 1000);
  await pool.query(
    'INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING',
    [jti, expiresAt]
  );
}

async function isRevoked(jti: string): Promise<boolean> {
  try {
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [jti]);
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

function extractPayload(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const payload = extractPayload(req);
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  if (!payload.jti) {
    req.jwtUser = payload;
    next();
    return;
  }

  isRevoked(payload.jti).then(revoked => {
    if (revoked) {
      if (!res.headersSent) res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
      return;
    }
    req.jwtUser = payload;
    next();
  });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payload = extractPayload(req);
    if (!payload) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const hasRole = roles.some(r => payload.roles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: 'Acesso não autorizado' });
      return;
    }

    if (!payload.jti) {
      req.jwtUser = payload;
      next();
      return;
    }

    isRevoked(payload.jti).then(revoked => {
      if (revoked) {
        if (!res.headersSent) res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
        return;
      }
      req.jwtUser = payload;
      next();
    });
  };
}
