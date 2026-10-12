import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const configuredJwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !configuredJwtSecret) {
  throw new Error('JWT_SECRET must be configured in production.');
}
export const JWT_SECRET = configuredJwtSecret || 'development-only-change-me';

// In-memory token revocation registry (blacklists tokens on logout)
const revokedTokens = new Set<string>();

export const revokeToken = (token: string): void => {
  if (token) {
    revokedTokens.add(token);
  }
};

export const isTokenRevoked = (token: string): boolean => {
  return revokedTokens.has(token);
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DATA_ENTRY' | 'REVIEWER' | 'READONLY';
  department?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Also support ?token= query parameter (useful for direct file downloads and CSV exports)
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Session has been revoked or logged out. Please sign in again.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decoded as AuthUser;
    next();
  });
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${roles.join(' or ')}. Your role is ${req.user.role}.`
      });
    }

    next();
  };
};

// Convenience role checks
export const requireAdmin = requireRoles(['ADMIN']);
export const requireDataEntryOrAdmin = requireRoles(['ADMIN', 'DATA_ENTRY']);
export const requireReviewerOrAdmin = requireRoles(['ADMIN', 'REVIEWER']);
export const requireWrite = requireRoles(['ADMIN', 'DATA_ENTRY', 'REVIEWER']);
