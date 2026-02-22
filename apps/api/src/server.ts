import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { getHealth } from "./modules/health/health.controller";
import { stellarService } from "./config/stellar";
import reportsRoutes from "./modules/reports/reports.routes";
import authRoutes from "./modules/auth/auth.routes";
import { logger } from "./core/logging/logger";
import { requestLogger } from "./core/logging/request-logger.middleware";
import { errorHandler, notFoundHandler } from "./core/errors/error-handler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/api/health", getHealth);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportsRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    logger.info("Initializing Stellar service");
    await stellarService.ensureFunded();

    app.listen(PORT, () => {
      logger.info("Server started", { port: PORT });
    });
  } catch (error) {
    logger.error("Server bootstrap failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message });
  process.exit(1);
});

startServer();
