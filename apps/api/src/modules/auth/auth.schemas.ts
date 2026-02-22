import { z } from 'zod';

const trimmedRequired = (label: string) =>
  z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be a string`,
    })
    .trim()
    .min(1, `${label} is required`);

export const refreshTokenBodySchema = z.object({
  deviceId: trimmedRequired('deviceId'),
  refreshToken: z.string().trim().min(1).optional(),
  clientType: z.enum(['web', 'mobile']).default('web'),
});

export type RefreshTokenDTO = z.infer<typeof refreshTokenBodySchema>;
