import { RequestHandler } from "express";
import { logger } from "./logger";

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info("HTTP request completed", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
      authorization: req.headers.authorization ?? null,
    });
  });

  next();
};
