import mongoose from 'mongoose';
import { logger } from '../core/logging/logger';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/sidewalk',
    );
    logger.info('MongoDB connected', { host: conn.connection.host });
  } catch (error) {
    logger.error('MongoDB connection failed', { error: (error as Error).message });
    throw error;
  }
};
