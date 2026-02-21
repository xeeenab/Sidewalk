import { Router } from 'express';
import {
  createReport,
  verifyReport,
  updateReportStatus,
  verifyStatus,
} from './reports.controller';
import { validateRequest } from '../../core/validation/validate-request';
import {
  createReportBodySchema,
  updateReportStatusBodySchema,
  verifyReportBodySchema,
  verifyStatusBodySchema,
} from './reports.schemas';

const router: Router = Router();

router.post('/', validateRequest({ body: createReportBodySchema }), createReport);

router.post(
  '/verify',
  validateRequest({ body: verifyReportBodySchema }),
  verifyReport,
);

router.post(
  '/status',
  validateRequest({ body: updateReportStatusBodySchema }),
  updateReportStatus,
);

router.post(
  '/status/verify',
  validateRequest({ body: verifyStatusBodySchema }),
  verifyStatus,
);

export default router;
