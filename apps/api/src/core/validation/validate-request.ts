import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

type ValidationSchema = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export const validateRequest = (schema: ValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
