import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import authRoutes from './auth.routes';
import { errorHandler, notFoundHandler } from '../../core/errors/error-handler';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

test('dev session endpoint returns 404 when local bootstrap is not enabled', async () => {
  const previousAllow = process.env.ALLOW_DEV_SESSION;
  const previousSecret = process.env.DEV_SESSION_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    delete process.env.ALLOW_DEV_SESSION;
    delete process.env.DEV_SESSION_SECRET;
    process.env.NODE_ENV = 'development';

    const response = await request(buildApp()).post('/api/auth/dev/session').send({
      userId: 'user-1',
      role: 'CITIZEN',
      deviceId: 'device-1',
      clientType: 'mobile',
    });

    assert.equal(response.status, 404);
  } finally {
    process.env.ALLOW_DEV_SESSION = previousAllow;
    process.env.DEV_SESSION_SECRET = previousSecret;
    process.env.NODE_ENV = previousNodeEnv;
  }
});
