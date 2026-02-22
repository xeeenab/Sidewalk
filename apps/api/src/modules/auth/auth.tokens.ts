import crypto from 'crypto';
import { Types } from 'mongoose';
import { AppError } from '../../core/errors/app-error';
import { logger } from '../../core/logging/logger';
import { signAccessToken, signRefreshToken, verifyJwt } from './auth.jwt';
import { RefreshTokenModel } from './refresh-token.model';
import { AuthenticatedUser } from './auth.types';

const REFRESH_GRACE_MS = 10_000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

const nowPlus = (ms: number) => new Date(Date.now() + ms);

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

const issuePair = async (
  user: AuthenticatedUser,
  deviceId: string,
  familyId?: string,
): Promise<TokenPair & { tokenId: string; familyId: string }> => {
  const tokenId = new Types.ObjectId().toHexString();
  const effectiveFamilyId = familyId ?? new Types.ObjectId().toHexString();
  const refreshToken = signRefreshToken(user, deviceId, effectiveFamilyId, tokenId);
  const accessToken = signAccessToken(user);
  const refreshExpiresAt = nowPlus(REFRESH_TTL_MS);

  await RefreshTokenModel.create({
    userId: user.id,
    role: user.role,
    district: user.district,
    deviceId,
    familyId: effectiveFamilyId,
    tokenId,
    tokenHash: hashToken(refreshToken),
    status: 'ACTIVE',
    expiresAt: refreshExpiresAt,
  });

  return { accessToken, refreshToken, refreshExpiresAt, tokenId, familyId: effectiveFamilyId };
};

export const createInitialSession = async (
  user: AuthenticatedUser,
  deviceId: string,
): Promise<TokenPair> => {
  const pair = await issuePair(user, deviceId);
  return {
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    refreshExpiresAt: pair.refreshExpiresAt,
  };
};

const revokeAllUserSessions = async (userId: string, reason: string) => {
  await RefreshTokenModel.updateMany(
    { userId, status: { $ne: 'REVOKED' } },
    {
      $set: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    },
  );
};

export const rotateRefreshToken = async (
  refreshToken: string,
  deviceId: string,
): Promise<TokenPair> => {
  const decoded = verifyJwt(refreshToken);
  if (typeof decoded === 'string') {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (decoded.tokenType !== 'refresh') {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const userId = decoded.sub;
  const role = decoded.role;
  const district =
    typeof decoded.district === 'string' ? decoded.district : undefined;
  const familyId = decoded.familyId as string | undefined;
  const presentedDeviceId = decoded.deviceId as string | undefined;

  if (
    typeof userId !== 'string' ||
    (role !== 'CITIZEN' && role !== 'AGENCY_ADMIN') ||
    !familyId ||
    !presentedDeviceId
  ) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (presentedDeviceId !== deviceId) {
    throw new AppError('Device mismatch', 401, 'DEVICE_MISMATCH');
  }

  const tokenHash = hashToken(refreshToken);
  const existing = await RefreshTokenModel.findOne({ tokenHash });

  if (!existing) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  if (existing.status === 'REVOKED') {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (existing.status === 'ROTATED') {
    const withinGrace =
      existing.graceUntil && existing.graceUntil.getTime() > Date.now();
    if (withinGrace) {
      throw new AppError(
        'Refresh already in progress. Retry with latest token.',
        409,
        'REFRESH_IN_PROGRESS',
      );
    }

    await revokeAllUserSessions(existing.userId, 'reuse_detected');
    throw new AppError('Refresh token reuse detected', 401, 'TOKEN_REUSE_DETECTED');
  }

  const now = new Date();
  const rotated = await RefreshTokenModel.findOneAndUpdate(
    { _id: existing._id, status: 'ACTIVE' },
    {
      $set: {
        status: 'ROTATED',
        usedAt: now,
        rotatedAt: now,
        graceUntil: new Date(now.getTime() + REFRESH_GRACE_MS),
      },
    },
    { new: true },
  );

  if (!rotated) {
    throw new AppError(
      'Refresh already in progress. Retry with latest token.',
      409,
      'REFRESH_IN_PROGRESS',
    );
  }

  const issued = await issuePair(
    { id: userId, role, district },
    deviceId,
    existing.familyId,
  );

  await RefreshTokenModel.updateOne(
    { _id: existing._id },
    {
      $set: {
        replacedByTokenId: issued.tokenId,
      },
    },
  );

  logger.info('Refresh token rotated', {
    userId,
    deviceId,
    familyId,
  });

  return {
    accessToken: issued.accessToken,
    refreshToken: issued.refreshToken,
    refreshExpiresAt: issued.refreshExpiresAt,
  };
};
