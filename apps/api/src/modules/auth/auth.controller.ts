import { NextFunction, Request, Response } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { AppError } from '../../core/errors/app-error';
import { createInitialSession, rotateRefreshToken } from './auth.tokens';
import { RefreshTokenDTO } from './auth.schemas';
import { Role } from './auth.types';

const COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName || rest.length === 0) {
      return acc;
    }

    acc[rawName] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth/refresh',
  });
};

export const refreshSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { deviceId, refreshToken: bodyRefreshToken, clientType } =
      req.body as RefreshTokenDTO;
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = bodyRefreshToken ?? cookies[COOKIE_NAME];

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 401, 'MISSING_REFRESH_TOKEN'));
    }

    const pair = await rotateRefreshToken(refreshToken, deviceId);

    if (clientType === 'web') {
      setRefreshCookie(res, pair.refreshToken);
      return res.status(200).json({
        accessToken: pair.accessToken,
        expiresIn: '15m',
      });
    }

    return res.status(200).json({
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      refreshTokenExpiresAt: pair.refreshExpiresAt.toISOString(),
      expiresIn: '15m',
    });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ error: 'token_expired' });
    }

    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return next(error);
  }
};

// Temporary bootstrap endpoint until OTP/passwordless login lands.
export const issueDevSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError('Not found', 404, 'NOT_FOUND'));
    }

    const {
      userId,
      role,
      district,
      deviceId,
      clientType,
    } = req.body as {
      userId?: string;
      role?: Role;
      district?: string;
      deviceId?: string;
      clientType?: 'web' | 'mobile';
    };

    if (!userId || !deviceId || (role !== 'CITIZEN' && role !== 'AGENCY_ADMIN')) {
      return next(new AppError('Invalid bootstrap session payload', 400, 'INVALID_PAYLOAD'));
    }

    const pair = await createInitialSession(
      { id: userId, role, district },
      deviceId,
    );

    if (clientType === 'web') {
      setRefreshCookie(res, pair.refreshToken);
      return res.status(201).json({
        accessToken: pair.accessToken,
        expiresIn: '15m',
      });
    }

    return res.status(201).json({
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      refreshTokenExpiresAt: pair.refreshExpiresAt.toISOString(),
      expiresIn: '15m',
    });
  } catch (error) {
    return next(error);
  }
};
