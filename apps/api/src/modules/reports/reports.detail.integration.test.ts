import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import reportsRoutes from './reports.routes';
import { ReportModel } from './report.model';
import { StatusUpdateModel } from './status-update.model';
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

test('GET /api/reports/:reportId returns report detail payload', async () => {
  const originalFindById = ReportModel.findById;
  const originalStatusFind = StatusUpdateModel.find;
  const originalMediaFind = MediaUploadModel.find;

  try {
    ReportModel.findById = ((reportId: string) => ({
      lean: async () =>
        reportId === '507f1f77bcf86cd799439011'
          ? {
              _id: '507f1f77bcf86cd799439011',
              title: 'Broken drainage',
              description: 'Water is not clearing after rain.',
              category: 'DRAINAGE',
              status: 'PENDING',
              location: { type: 'Point', coordinates: [3.35, 6.6] },
              media_urls: ['https://media.example/report-1.jpg'],
              anchor_status: 'ANCHOR_QUEUED',
              anchor_attempts: 1,
              anchor_last_error: null,
              anchor_needs_attention: false,
              anchor_failed_at: null,
              stellar_tx_hash: null,
              snapshot_hash: 'snapshot-hash',
              data_hash: 'content-hash',
              exif_verified: true,
              exif_distance_meters: 12,
              integrity_flag: 'NORMAL',
              createdAt: new Date('2026-03-25T10:00:00.000Z'),
              updatedAt: new Date('2026-03-25T10:05:00.000Z'),
            }
          : null,
    })) as unknown as typeof ReportModel.findById;

    StatusUpdateModel.find = (() => ({
      sort: () => ({
        lean: async () => [
          {
            _id: '507f191e810c19729de860ea',
            previousStatus: 'PENDING',
            nextStatus: 'ACKNOWLEDGED',
            note: 'Agency has received the report',
            actorId: '507f191e810c19729de860ff',
            createdAt: new Date('2026-03-25T10:10:00.000Z'),
            updatedAt: new Date('2026-03-25T10:10:00.000Z'),
          },
        ],
      }),
    })) as unknown as typeof StatusUpdateModel.find;

    MediaUploadModel.find = (() => ({
      select: () => ({
        lean: async () => [
          {
            _id: '507f191e810c19729de860ab',
            url: 'https://media.example/report-1.jpg',
            optimized_url: 'https://media.example/report-1.webp',
            processing_status: 'DONE',
            exif_verified: true,
          },
        ],
      }),
    })) as unknown as typeof MediaUploadModel.find;

    const token = jwt.sign(
      { sub: 'user-1', role: 'CITIZEN', tokenType: 'access' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '15m' },
    );

    const response = await request(buildApp())
      .get('/api/reports/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, '507f1f77bcf86cd799439011');
    assert.equal(response.body.data.anchor.status, 'ANCHOR_QUEUED');
    assert.equal(response.body.data.media[0].url, 'https://media.example/report-1.webp');
    assert.equal(response.body.data.history[0].nextStatus, 'ACKNOWLEDGED');
  } finally {
    ReportModel.findById = originalFindById;
    StatusUpdateModel.find = originalStatusFind;
    MediaUploadModel.find = originalMediaFind;
  }
});

test('GET /api/reports/:reportId returns 404 when report is missing', async () => {
  const originalFindById = ReportModel.findById;

  try {
    ReportModel.findById = (() => ({
      lean: async () => null,
    })) as unknown as typeof ReportModel.findById;

    const token = jwt.sign(
      { sub: 'user-1', role: 'CITIZEN', tokenType: 'access' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '15m' },
    );

    const response = await request(buildApp())
      .get('/api/reports/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, 'REPORT_NOT_FOUND');
  } finally {
    ReportModel.findById = originalFindById;
  }
});
