import { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "./app-error";
import { logger } from "../logging/logger";

type StandardErrorBody = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
    stack?: string;
  };
};

const formatError = (err: unknown): { statusCode: number; body: StandardErrorBody } => {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: {
        success: false,
        error: {
          message: err.message,
          code: err.code,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
    };
  }

  const unknownError = err as { name?: string; message?: string; code?: number | string };
  const isProd = process.env.NODE_ENV === "production";

  if (unknownError?.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      body: {
        success: false,
        error: {
          message: "Token expired",
          code: "TOKEN_EXPIRED",
        },
      },
    };
  }

  if (unknownError?.name === "JsonWebTokenError") {
    return {
      statusCode: 401,
      body: {
        success: false,
        error: {
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        },
      },
    };
  }

  if (unknownError?.name === "ZodError") {
    const details = (err as { issues?: Array<{ path?: unknown[]; message?: string }> }).issues?.map(
      (issue) => ({
        field: Array.isArray(issue.path) ? issue.path.join(".") : "",
        message: issue.message ?? "Invalid value",
      }),
    );

    return {
      statusCode: 400,
      body: {
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          ...(details ? { details } : {}),
        },
      },
    };
  }

  if (unknownError?.name === "MongoServerError" && unknownError?.code === 11000) {
    return {
      statusCode: 409,
      body: {
        success: false,
        error: {
          message: "Duplicate key error",
          code: "DUPLICATE_KEY",
        },
      },
    };
  }

  const message = unknownError?.message ?? "Internal server error";
  return {
    statusCode: 500,
    body: {
      success: false,
      error: {
        message: isProd ? "Internal server error" : message,
        code: "INTERNAL_SERVER_ERROR",
        ...(!isProd && err instanceof Error && err.stack ? { stack: err.stack } : {}),
      },
    },
  };
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const formatted = formatError(err);

  logger.error("Unhandled request error", {
    method: req.method,
    url: req.originalUrl,
    statusCode: formatted.statusCode,
    errorName: err instanceof Error ? err.name : "UnknownError",
    errorMessage: err instanceof Error ? err.message : String(err),
  });

  res.status(formatted.statusCode).json(formatted.body);
};
