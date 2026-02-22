import { PassThrough, Transform, TransformCallback } from 'stream';
import Busboy from 'busboy';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../core/errors/app-error';
import { buildObjectKey, uploadStreamToS3 } from './media.s3';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp';

const detectMimeFromHeader = (buffer: Buffer): AllowedMime | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
};

class MagicNumberValidator extends Transform {
  private readonly maxProbeBytes = 12;
  private probe = Buffer.alloc(0);
  private verified = false;
  private detectedMime: AllowedMime | null = null;

  get mime(): AllowedMime | null {
    return this.detectedMime;
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    if (!this.verified) {
      this.probe = Buffer.concat([this.probe, chunk]);

      if (this.probe.length >= this.maxProbeBytes) {
        const detected = detectMimeFromHeader(this.probe);
        if (!detected) {
          callback(new AppError('Unsupported media type', 415, 'UNSUPPORTED_MEDIA_TYPE'));
          return;
        }
        this.detectedMime = detected;
        this.verified = true;
        this.emit('verified', detected);
      }
    }

    callback(null, chunk);
  }
}

export const uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return next(new AppError('Expected multipart/form-data', 400, 'INVALID_CONTENT_TYPE'));
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: MAX_UPLOAD_SIZE_BYTES,
      },
    });

    let uploadPromise: Promise<{ key: string; url: string }> | null = null;
    let receivedFile = false;
    let fileTooLarge = false;

    busboy.on('file', (_fieldname: string, file: NodeJS.ReadableStream) => {
      if (receivedFile) {
        file.resume();
        return;
      }

      receivedFile = true;

      const validator = new MagicNumberValidator();
      const passThrough = new PassThrough();

      file.on('limit', () => {
        fileTooLarge = true;
        validator.destroy(
          new AppError('File too large (max 10MB)', 415, 'UNSUPPORTED_MEDIA_TYPE'),
        );
      });

      validator.on('error', () => {
        file.unpipe(validator);
        passThrough.destroy(new AppError('Unsupported media type', 415, 'UNSUPPORTED_MEDIA_TYPE'));
      });

      file.pipe(validator).pipe(passThrough);

      uploadPromise = new Promise<{ key: string; url: string }>((resolve, reject) => {
        validator.once('verified', () => {
          const mime = validator.mime;
          if (!mime) {
            reject(new AppError('Unsupported media type', 415, 'UNSUPPORTED_MEDIA_TYPE'));
            return;
          }

          const key = buildObjectKey(mime);
          uploadStreamToS3(passThrough, mime, key).then(resolve).catch(reject);
        });

        validator.once('error', reject);
      });
    });

    busboy.on('finish', async () => {
      try {
        if (!receivedFile || !uploadPromise) {
          return next(new AppError('No file uploaded', 400, 'FILE_REQUIRED'));
        }

        const uploaded = await uploadPromise;
        return res.status(201).json({
          key: uploaded.key,
          url: uploaded.url,
        });
      } catch (error) {
        if (fileTooLarge) {
          return next(new AppError('File too large (max 10MB)', 415, 'UNSUPPORTED_MEDIA_TYPE'));
        }
        return next(error);
      }
    });

    busboy.on('error', (error: Error) => next(error));

    req.pipe(busboy);
  } catch (error) {
    return next(error);
  }
};
