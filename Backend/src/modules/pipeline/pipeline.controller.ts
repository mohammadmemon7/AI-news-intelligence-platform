import { Request, Response, NextFunction } from 'express';
import { pipelineService } from './pipeline.service';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export const runPipeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = (req.headers['x-pipeline-secret'] as string)?.trim();
    const expectedSecret = env!.PIPELINE_SECRET?.trim();
    
    if (secret !== expectedSecret) {
      logger.warn(`Unauthorized pipeline trigger attempt from IP: ${req.ip}. Expected start: ${expectedSecret.slice(0, 3)}...`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid pipeline secret',
        },
      });
    }

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

export const processArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = (req.headers['x-pipeline-secret'] as string)?.trim();
    const expectedSecret = env!.PIPELINE_SECRET?.trim();

    if (!secret || secret !== expectedSecret) {
      logger.warn(`Pipeline trigger denied: Secret mismatch. Expected start: ${expectedSecret.slice(0, 3)}...`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid pipeline secret',
        },
      });
    }

    const { id } = req.params;
    const article = await pipelineService.processSingleArticle(id as string);
    
    res.status(200).json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = pipelineService.getStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};
