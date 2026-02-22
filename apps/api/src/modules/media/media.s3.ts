import { randomUUID } from 'crypto';
import { Upload } from '@aws-sdk/lib-storage';
import { PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { AppError } from '../../core/errors/app-error';

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION ?? 'us-east-1';
const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

if (!bucket) {
  throw new AppError('Missing S3_BUCKET environment variable', 500, 'S3_CONFIG_MISSING');
}

if (!accessKeyId || !secretAccessKey) {
  throw new AppError(
    'Missing S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY environment variable',
    500,
    'S3_CONFIG_MISSING',
  );
}

const client = new S3Client({
  region,
  ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const extensionForMime = (mime: string) => {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '';
};

const buildObjectUrl = (objectKey: string) => {
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/+$/, '')}/${objectKey}`;
  }

  if (endpoint) {
    const normalized = endpoint.replace(/\/+$/, '');
    return `${normalized}/${bucket}/${objectKey}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
};

export const buildObjectKey = (mime: string) => {
  const ext = extensionForMime(mime);
  return `reports/${randomUUID()}${ext}`;
};

export const uploadStreamToS3 = async (
  body: Readable,
  mime: string,
  objectKey: string,
) => {
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: objectKey,
    Body: body,
    ContentType: mime,
  };

  const upload = new Upload({
    client,
    params,
  });

  await upload.done();

  return {
    key: objectKey,
    url: buildObjectUrl(objectKey),
  };
};
