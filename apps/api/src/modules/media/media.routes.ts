import { Router } from 'express';
import { authenticateToken, requireRole } from '../auth/auth.middleware';
import { uploadMedia } from './media.upload';

const router: Router = Router();

router.post(
  '/upload',
  authenticateToken,
  requireRole(['CITIZEN', 'AGENCY_ADMIN']),
  uploadMedia,
);

export default router;
