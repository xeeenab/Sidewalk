import dotenv from 'dotenv';
import { logger } from '../core/logging/logger';
import { startMediaProcessingWorker } from '../modules/media/media.queue';

dotenv.config();

startMediaProcessingWorker();
logger.info('Media worker started');
