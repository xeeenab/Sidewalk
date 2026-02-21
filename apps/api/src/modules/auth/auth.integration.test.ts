import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import reportsRoutes from '../reports/reports.routes';
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

test('CITIZEN token is rejected from AGENCY_ADMIN endpoint', async () => {
  const app = buildApp();
  const token = jwt.sign({ sub: 'user-1', role: 'CITIZEN' }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });

  const response = await request(app)
    .post('/api/reports/status')
    .set('Authorization', `Bearer ${token}`)
    .send({
      originalTxHash: 'abc123',
      status: 'ACKNOWLEDGED',
    });

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { error: 'forbidden' });
});

test('expired token returns token_expired payload', async () => {
  const app = buildApp();
  const token = jwt.sign(
    { sub: 'admin-1', role: 'AGENCY_ADMIN' },
    process.env.JWT_SECRET!,
    {
      algorithm: 'HS256',
      expiresIn: -1,
    },
  );

  const response = await request(app)
    .post('/api/reports/status')
    .set('Authorization', `Bearer ${token}`)
    .send({
      originalTxHash: 'abc123',
      status: 'ACKNOWLEDGED',
    });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { error: 'token_expired' });
});
