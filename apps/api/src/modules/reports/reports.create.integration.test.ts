import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import reportsRoutes from './reports.routes';
import { ReportModel } from './report.model';
import { MediaUploadModel } from '../media/media-upload.model';
import { errorHandler, notFoundHandler } from '../../core/errors/error-handler';

process.env.JWT_SECRET = 'test-secret';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

test('POST /api/reports creates a report and queues anchoring', async () => {
  const originalFindOne = MediaUploadModel.findOne;
  const originalCreate = ReportModel.create;

  try {
    MediaUploadModel.findOne = (async () => null) as unknown as typeof MediaUploadModel.findOne;
    ReportModel.create = (async (payload: {
      title: string;
      category: string;
      status?: string;
      data_hash: string;
    }) =>
      ({
        _id: '507f1f77bcf86cd799439011',
        ...payload,
      }) as never) as unknown as typeof ReportModel.create;

    const token = jwt.sign(
      { sub: 'user-123', role: 'CITIZEN', tokenType: 'access' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '15m' },
    );

    const response = await request(buildApp())
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Road cave-in',
        description: 'The asphalt has opened beside the curb.',
        category: 'INFRASTRUCTURE',
        location: { type: 'Point', coordinates: [3.45, 6.47] },
        media_urls: [],
      });

    assert.equal(response.status, 202);
    assert.equal(response.body.report_id, '507f1f77bcf86cd799439011');
    assert.equal(response.body.anchor_status, 'ANCHOR_QUEUED');
    assert.equal(typeof response.body.content_hash, 'string');
  } finally {
    MediaUploadModel.findOne = originalFindOne;
    ReportModel.create = originalCreate;
  }
});
