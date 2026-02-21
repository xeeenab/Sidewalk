import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { stellarService } from '../../config/stellar';
import { AppError } from '../../core/errors/app-error';
import { logger } from '../../core/logging/logger';
import {
  CreateReportDTO,
  UpdateReportStatusDTO,
  VerifyReportDTO,
  VerifyStatusDTO,
} from './reports.schemas';

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { description } = req.body as CreateReportDTO;

    const contentHash = crypto
      .createHash('sha256')
      .update(description, 'utf8')
      .digest('hex');
    const txHash = await stellarService.anchorHash(contentHash);

    return res.status(201).json({
      message: 'Report created and anchored',
      content_hash: contentHash,
      stellar_tx: txHash,
      explorer_url: stellarService.getExplorerUrl(txHash),
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
