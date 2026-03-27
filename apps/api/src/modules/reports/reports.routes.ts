import { Router } from 'express';
import {
  addReportComment,
  createReport,
  getPublicReportById,
  getReportDetail,
  getReportComments,
  listReports,
  listPublicReports,
  getMapReports,
  getMyReports,
  verifyReport,
  updateReportStatus,
  verifyStatus,
} from './reports.controller';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { validateRequest } from '../../core/validation/validate-request';
import { stellarAnchoringRateLimiter } from '../../core/rate-limit/rate-limit.middleware';
import {
  createReportBodySchema,
  myReportsQuerySchema,
  listReportsQuerySchema,
  publicReportListQuerySchema,
  reportCommentBodySchema,
  reportDetailParamsSchema,
  reportsMapQuerySchema,
  updateReportStatusBodySchema,
  verifyReportBodySchema,
  verifyStatusBodySchema,
} from './reports.schemas';

const router: Router = Router();

router.get(
  '/public',
  validateRequest({ query: publicReportListQuerySchema }),
  listPublicReports,
);

router.get(
  '/public/:reportId',
  validateRequest({ params: reportDetailParamsSchema }),
  getPublicReportById,
);

router.get(
  '/',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ query: listReportsQuerySchema }),
  listReports,
);

router.get(
  '/map',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ query: reportsMapQuerySchema }),
  getMapReports,
);

router.get(
  '/mine',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ query: myReportsQuerySchema }),
  getMyReports,
);

router.post(
  '/',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  stellarAnchoringRateLimiter,
  validateRequest({ body: createReportBodySchema }),
  createReport,
);

router.get(
  '/:reportId',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ params: reportDetailParamsSchema }),
  getReportDetail,
);

router.get(
  '/:reportId/comments',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ params: reportDetailParamsSchema }),
  getReportComments,
);

router.post(
  '/:reportId/comments',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  validateRequest({ params: reportDetailParamsSchema, body: reportCommentBodySchema }),
  addReportComment,
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
