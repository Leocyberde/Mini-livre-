import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-dev-secret';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  id: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

function extractPayload(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) return res.status(401).json({ error: 'Não autenticado' });
  req.jwtUser = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = extractPayload(req);
    if (!payload) return res.status(401).json({ error: 'Não autenticado' });
    const hasRole = roles.some(r => payload.roles.includes(r));
    if (!hasRole) return res.status(403).json({ error: 'Acesso não autorizado' });
    req.jwtUser = payload;
    next();
  };
}
