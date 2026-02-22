import { Schema, model } from 'mongoose';
import { Role } from './auth.types';

export type RefreshTokenStatus = 'ACTIVE' | 'ROTATED' | 'REVOKED';

export interface RefreshTokenRecord {
  userId: string;
  role: Role;
  district?: string;
  deviceId: string;
  familyId: string;
  tokenId: string;
  tokenHash: string;
  status: RefreshTokenStatus;
  expiresAt: Date;
  usedAt?: Date;
  rotatedAt?: Date;
  graceUntil?: Date;
  replacedByTokenId?: string;
  revokedAt?: Date;
  revokedReason?: string;
}

const refreshTokenSchema = new Schema<RefreshTokenRecord>(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ['CITIZEN', 'AGENCY_ADMIN'] },
    district: { type: String, required: false },
    deviceId: { type: String, required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'ROTATED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
    rotatedAt: { type: Date },
    graceUntil: { type: Date },
    replacedByTokenId: { type: String },
    revokedAt: { type: Date },
    revokedReason: { type: String },
  },
  { timestamps: true },
);

export const RefreshTokenModel = model<RefreshTokenRecord>(
  'RefreshToken',
  refreshTokenSchema,
);
