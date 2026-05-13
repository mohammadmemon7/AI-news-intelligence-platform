import { Request, Response, NextFunction } from 'express';
import { pipelineService } from './pipeline.service';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export const runPipeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fix 4: Validate PIPELINE_SECRET in request header as per PRD section 5.2
    const secret = req.headers['x-pipeline-secret'];
    
    if (secret !== env.PIPELINE_SECRET) {
      logger.warn(`Unauthorized pipeline trigger attempt from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid pipeline secret',
        },
      });
    }

    // Run pipeline asynchronously to avoid blocking the request
    pipelineService.run().catch(err => {
        logger.error('Background pipeline error:', err);
    });

    res.status(202).json({
      success: true,
      data: {
        message: 'Pipeline started successfully in the background.',
      },
    });
  } catch (error) {
    next(error);
  }
};
