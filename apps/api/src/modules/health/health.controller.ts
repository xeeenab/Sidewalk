import { NextFunction, Request, Response } from 'express';

import { stellarService } from '../../config/stellar';
import { AppError } from '../../core/errors/app-error';

export const getHealth = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stellarStatus = await stellarService.getHealth();

    res.status(200).json({
      status: 'ok',
      service: 'sidewalk-api',
      stellar_connected: stellarStatus,
      timestamp: new Date().toISOString(),
    });
  } catch {
    next(new AppError('Health check failed', 500, 'HEALTH_CHECK_FAILED'));
  }
};
