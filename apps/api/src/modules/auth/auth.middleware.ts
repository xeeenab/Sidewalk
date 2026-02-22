import { NextFunction, Request, Response } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AuthenticatedUser, ROLES, Role } from './auth.types';
import { getJwtConfig } from './auth.jwt';

const parseBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const normalizeUser = (payload: jwt.JwtPayload): AuthenticatedUser | null => {
  if (payload.tokenType !== 'access') {
    return null;
  }

  const id = (payload.sub as string | undefined) ?? (payload.id as string | undefined);
  const role = payload.role as Role | undefined;

  if (!id || !role || !ROLES.includes(role)) {
    return null;
  }

  const district = typeof payload.district === 'string' ? payload.district : undefined;

  return { id, role, district };
};

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const config = getJwtConfig();
    const decoded = jwt.verify(token, config.verificationKey, {
      algorithms: [config.algorithm],
    });

    if (typeof decoded === 'string') {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const user = normalizeUser(decoded);
    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({ error: 'token_expired' });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    next(error);
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    next();
  };
};
