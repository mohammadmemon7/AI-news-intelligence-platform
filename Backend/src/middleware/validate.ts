import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      if (parsed.body) {
        req.body = parsed.body;
      }
      
      if (parsed.query) {
        // Express 5.x might have read-only req.query, so we update properties in-place
        Object.keys(req.query).forEach(key => delete (req.query as any)[key]);
        Object.assign(req.query, parsed.query);
      }
      
      if (parsed.params) {
        // Update params in-place
        Object.keys(req.params).forEach(key => delete (req.params as any)[key]);
        Object.assign(req.params, parsed.params);
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        const issues = error.issues || (error as any).errors || [];
        issues.forEach((err: any) => {
          const path = err.path.join('.');
          if (!fields[path]) fields[path] = [];
          fields[path].push(err.message);
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            fields,
          },
        });
      }
      return next(error);
    }
  };
};
