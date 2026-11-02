import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", "),
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "VALIDATION_ERROR",
          message: error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", "),
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
}
