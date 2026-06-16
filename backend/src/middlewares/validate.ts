import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError || (error as any).name === 'ZodError') {
        const errorsList = (error as any).issues || (error as any).errors || [];
        console.error('Validation error body:', req.body);
        console.error('Validation errors:', JSON.stringify(errorsList, null, 2));
        return res.status(400).json({
          status: 'error',
          message: 'Error de validación',
          errors: errorsList.map((err: any) => ({
            field: err.path?.join('.') || 'unknown',
            message: err.message
          }))
        });
      }
      return next(error);
    }
  };
};
