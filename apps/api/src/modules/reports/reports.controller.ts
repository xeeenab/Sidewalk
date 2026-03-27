import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { stellarService } from '../../config/stellar';
import { AppError } from '../../core/errors/app-error';
import { logger } from '../../core/logging/logger';
import { MediaDraftModel } from '../media/media-draft.model';
import { MediaUploadModel } from '../media/media-upload.model';
import { ReportModel } from './report.model';
import { enqueueStellarAnchor } from './reports.anchor.queue';
import {
  CreateReportDTO,
  ReportsMapQueryDTO,
  UpdateReportStatusDTO,
  VerifyReportDTO,
  VerifyStatusDTO,
} from './reports.schemas';

const haversineMeters = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, description, category, location, media_urls, draft_id } =
      req.body as CreateReportDTO;
    const reporterId = req.user?.id ?? null;

    const mediaUrls = media_urls ?? [];
    const mediaUploads = mediaUrls.length
      ? await MediaUploadModel.find({ url: { $in: mediaUrls } }).lean()
      : [];

    if (mediaUploads.length !== mediaUrls.length) {
      throw new AppError('One or more media uploads could not be found', 400, 'MEDIA_NOT_FOUND');
    }

    for (const upload of mediaUploads) {
      if (upload.owner_user_id !== reporterId) {
        throw new AppError('Media uploads must belong to the current user', 403, 'MEDIA_FORBIDDEN');
      }

      if (draft_id && upload.draft_id !== draft_id) {
        throw new AppError('Media upload is not linked to the supplied draft', 400, 'MEDIA_DRAFT_MISMATCH');
      }
    }

    if (draft_id) {
      const draft = await MediaDraftModel.findById(draft_id);
      if (!draft || draft.owner_user_id !== reporterId || draft.status !== 'OPEN') {
        throw new AppError('Media draft not found', 404, 'MEDIA_DRAFT_NOT_FOUND');
      }
    }

    const mediaUpload = mediaUploads[0] ?? null;

    let exifVerified = false;
    let exifDistanceMeters: number | null = null;
    let integrityFlag: 'NORMAL' | 'SUSPICIOUS' = 'NORMAL';

    if (mediaUpload?.exif_gps?.latitude !== undefined && mediaUpload?.exif_gps?.longitude !== undefined) {
      exifVerified = true;
      const [reportLng, reportLat] = location.coordinates;
      const exifLat = mediaUpload.exif_gps.latitude;
      const exifLng = mediaUpload.exif_gps.longitude;
      exifDistanceMeters = haversineMeters(reportLat, reportLng, exifLat, exifLng);

      if (exifDistanceMeters > 500) {
        integrityFlag = 'SUSPICIOUS';
      }
    }

    const contentHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({ title, description, category, location, media_urls: mediaUrls }),
        'utf8',
      )
      .digest('hex');

    const report = await ReportModel.create({
      reporter_user_id: reporterId,
      data_hash: contentHash,
      anchor_status: 'ANCHOR_QUEUED',
      anchor_attempts: 0,
      anchor_last_error: null,
      anchor_needs_attention: false,
      anchor_failed_at: null,
      title,
      description,
      category,
      location,
      media_urls: mediaUrls,
      stellar_tx_hash: null,
      snapshot_hash: contentHash,
      exif_verified: exifVerified,
      exif_distance_meters: exifDistanceMeters,
      integrity_flag: integrityFlag,
    });

    await enqueueStellarAnchor({
      reportId: String(report._id),
      dataHash: contentHash,
    });

    if (mediaUrls.length > 0) {
      await MediaUploadModel.updateMany(
        { url: { $in: mediaUrls } },
        {
          $set: {
            attached_report_id: String(report._id),
            expires_at: null,
          },
        },
      );
    }

    if (draft_id) {
      await MediaDraftModel.updateOne(
        { _id: draft_id },
        {
          $set: {
            status: 'FINALIZED',
          },
        },
      );
    }

    return res.status(202).json({
      message: 'Report accepted; anchoring queued',
      report_id: report._id,
      content_hash: contentHash,
      stellar_tx: null,
      anchor_status: 'ANCHOR_QUEUED',
      exif_verified: exifVerified,
      exif_distance_meters: exifDistanceMeters,
      integrity_flag: integrityFlag,
      explorer_url: null,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateReportStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { originalTxHash, status, evidence } = req.body as UpdateReportStatusDTO;

    const dataToHash = `${originalTxHash}:${status}:${evidence ?? ''}`;
    const statusHash = crypto
      .createHash('sha256')
      .update(dataToHash, 'utf8')
      .digest('hex');
    const statusTxHash = await stellarService.anchorHash(statusHash);

    return res.status(200).json({
      message: 'Status updated and anchored',
      status,
      original_report_tx: originalTxHash,
      status_update_tx: statusTxHash,
      explorer_url: stellarService.getExplorerUrl(statusTxHash),
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { txHash, originalDescription } = req.body as VerifyReportDTO;

    const expectedHash = crypto
      .createHash('sha256')
      .update(originalDescription, 'utf8')
      .digest('hex');
    const result = await stellarService.verifyTransaction(txHash, expectedHash);

    if (!result.valid) {
      return res.status(409).json({
        success: false,
        message:
          'Verification failed. The content has been altered or does not match the record.',
        timestamp: result.timestamp,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Content verified. It matches the on-chain record.',
      timestamp: result.timestamp,
      signer: result.sender,
      on_chain_hash: expectedHash,
    });
  } catch (error) {
    logger.warn('Report verification failed', {
      txHash: (req.body as { txHash?: string })?.txHash,
      error: error instanceof Error ? error.message : String(error),
    });
    return next(
      new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND'),
    );
  }
};

export const verifyStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { statusTxHash, originalTxHash, status, evidence } =
      req.body as VerifyStatusDTO;

    const dataToHash = `${originalTxHash}:${status}:${evidence ?? ''}`;
    const expectedHash = crypto
      .createHash('sha256')
      .update(dataToHash, 'utf8')
      .digest('hex');
    const result = await stellarService.verifyTransaction(
      statusTxHash,
      expectedHash,
    );

    if (!result.valid) {
      return res.status(409).json({
        success: false,
        message:
          'Broken chain. The status update does not match the provided report data.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chain verified. This status update belongs to that report.',
      timestamp: result.timestamp,
      signer: result.sender,
    });
  } catch (error) {
    logger.warn('Status verification failed', {
      statusTxHash: (req.body as { statusTxHash?: string })?.statusTxHash,
      error: error instanceof Error ? error.message : String(error),
    });
    return next(
      new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND'),
    );
  }
};

export const getMapReports = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = req.query as unknown as ReportsMapQueryDTO;

    const projection = {
      _id: 1,
      location: 1,
      status: 1,
      category: 1,
    } as const;

    let mapPins: Array<{
      _id: unknown;
      location: { type: 'Point'; coordinates: [number, number] };
      status: string;
      category: string;
    }> = [];

    if ('radiusInMeters' in query) {
      const { lat, lng, radiusInMeters } = query;
      mapPins = await ReportModel.find(
        {
          location: {
            $nearSphere: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: radiusInMeters,
            },
          },
        },
        projection,
      )
        .lean()
        .limit(5000)
        .exec();
    } else {
      const { minLat, maxLat, minLng, maxLng } = query;
      mapPins = await ReportModel.find(
        {
          location: {
            $geoWithin: {
              $box: [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
            },
          },
        },
        projection,
      )
        .lean()
        .limit(5000)
        .exec();
    }

    return res.status(200).json({
      count: mapPins.length,
      data: mapPins.map((pin) => ({
        _id: String(pin._id),
        location: pin.location,
        status: pin.status,
        category: pin.category,
      })),
    });
  } catch (error) {
    return next(error);
  }
};
