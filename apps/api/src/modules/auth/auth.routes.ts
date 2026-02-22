import { Router } from 'express';
import { validateRequest } from '../../core/validation/validate-request';
import { issueDevSession, refreshSession } from './auth.controller';
import { refreshTokenBodySchema } from './auth.schemas';
import { z } from 'zod';

const router: Router = Router();

router.post('/refresh', validateRequest({ body: refreshTokenBodySchema }), refreshSession);

const issueDevSessionSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['CITIZEN', 'AGENCY_ADMIN']),
  district: z.string().trim().min(1).optional(),
  deviceId: z.string().trim().min(1),
  clientType: z.enum(['web', 'mobile']).default('web'),
});

router.post('/dev/session', validateRequest({ body: issueDevSessionSchema }), issueDevSession);

export default router;
