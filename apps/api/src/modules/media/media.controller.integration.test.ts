import assert from 'node:assert/strict';
import test from 'node:test';

process.env.S3_BUCKET ??= 'sidewalk-test-bucket';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_ACCESS_KEY_ID ??= 'test-access-key';
process.env.S3_SECRET_ACCESS_KEY ??= 'test-secret-key';

type JsonBody = Record<string, unknown>;

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as JsonBody | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: JsonBody) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

test('getSecureMediaUrl returns a presigned URL for the report owner', async (t) => {
  const mediaController = await import('./media.controller');
  const mediaModel = await import('./media-upload.model');
  const reportModel = await import('../reports/report.model');
  const mediaS3 = await import('./media.s3');

  const findByIdMock = t.mock.method(mediaModel.MediaUploadModel, 'findById', () => ({
    lean: async () => ({
      _id: 'media-1',
      key: 'reports/test-1.jpg',
      url: 'https://cdn.sidewalk.test/reports/test-1.jpg',
    }),
  }));
  const findOneMock = t.mock.method(reportModel.ReportModel, 'findOne', () => ({
    select: () => ({
      lean: async () => ({
        _id: 'report-1',
        reporter_user_id: 'citizen-1',
      }),
    }),
  }));
  const presignMock = t.mock.method(
    mediaS3,
    'generatePresignedGetObjectUrl',
    async () => 'https://signed.sidewalk.test/reports/test-1.jpg?sig=123',
  );

  const req = {
    params: { fileId: 'media-1' },
    user: { id: 'citizen-1', role: 'CITIZEN' as const },
  };
  const res = createResponse();
  let nextError: unknown;

  await mediaController.getSecureMediaUrl(
    req as never,
    res as never,
    (error?: unknown) => {
      nextError = error;
    },
  );

  assert.equal(nextError, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    fileId: 'media-1',
    expiresInSeconds: 900,
    url: 'https://signed.sidewalk.test/reports/test-1.jpg?sig=123',
  });
  assert.equal(findByIdMock.mock.callCount(), 1);
  assert.equal(findOneMock.mock.callCount(), 1);
  assert.equal(presignMock.mock.callCount(), 1);
});

test('getSecureMediaUrl rejects a citizen who does not own the report media', async (t) => {
  const mediaController = await import('./media.controller');
  const mediaModel = await import('./media-upload.model');
  const reportModel = await import('../reports/report.model');

  t.mock.method(mediaModel.MediaUploadModel, 'findById', () => ({
    lean: async () => ({
      _id: 'media-2',
      key: 'reports/test-2.jpg',
      url: 'https://cdn.sidewalk.test/reports/test-2.jpg',
    }),
  }));
  t.mock.method(reportModel.ReportModel, 'findOne', () => ({
    select: () => ({
      lean: async () => ({
        _id: 'report-2',
        reporter_user_id: 'citizen-2',
      }),
    }),
  }));

  const req = {
    params: { fileId: 'media-2' },
    user: { id: 'citizen-1', role: 'CITIZEN' as const },
  };
  const res = createResponse();
  let nextError: unknown;

  await mediaController.getSecureMediaUrl(
    req as never,
    res as never,
    (error?: unknown) => {
      nextError = error;
    },
  );

  assert.equal(res.body, undefined);
  assert.match(String(nextError), /Forbidden/);
});

test('getSecureMediaUrl allows an agency admin to access linked report media', async (t) => {
  const mediaController = await import('./media.controller');
  const mediaModel = await import('./media-upload.model');
  const reportModel = await import('../reports/report.model');
  const mediaS3 = await import('./media.s3');

  t.mock.method(mediaModel.MediaUploadModel, 'findById', () => ({
    lean: async () => ({
      _id: 'media-3',
      key: 'reports/test-3.jpg',
      url: 'https://cdn.sidewalk.test/reports/test-3.jpg',
    }),
  }));
  t.mock.method(reportModel.ReportModel, 'findOne', () => ({
    select: () => ({
      lean: async () => ({
        _id: 'report-3',
        reporter_user_id: 'citizen-99',
      }),
    }),
  }));
  const presignMock = t.mock.method(
    mediaS3,
    'generatePresignedGetObjectUrl',
    async () => 'https://signed.sidewalk.test/reports/test-3.jpg?sig=456',
  );

  const req = {
    params: { fileId: 'media-3' },
    user: { id: 'admin-1', role: 'AGENCY_ADMIN' as const },
  };
  const res = createResponse();
  let nextError: unknown;

  await mediaController.getSecureMediaUrl(
    req as never,
    res as never,
    (error?: unknown) => {
      nextError = error;
    },
  );

  assert.equal(nextError, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.url, 'https://signed.sidewalk.test/reports/test-3.jpg?sig=456');
  assert.equal(presignMock.mock.callCount(), 1);
});
