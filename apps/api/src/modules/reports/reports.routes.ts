import { Router } from 'express';
import {
  createReport,
  verifyReport,
  updateReportStatus,
  verifyStatus,
} from './reports.controller';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { validateRequest } from '../../core/validation/validate-request';
import {
  createReportBodySchema,
  updateReportStatusBodySchema,
  verifyReportBodySchema,
  verifyStatusBodySchema,
} from './reports.schemas';

const router: Router = Router();

router.post(
  '/',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ body: createReportBodySchema }),
  createReport,
);

router.post(
  '/verify',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ body: verifyReportBodySchema }),
  verifyReport,
);

router.post(
  '/status',
  authenticateToken,
  requireRole(['AGENCY_ADMIN']),
  validateRequest({ body: updateReportStatusBodySchema }),
  updateReportStatus,
);

router.post(
  '/status/verify',
  authenticateToken,
  requireRole(['AGENCY_ADMIN']),
  validateRequest({ body: verifyStatusBodySchema }),
  verifyStatus,
);

export default router;
