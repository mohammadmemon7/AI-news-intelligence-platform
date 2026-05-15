import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { globalLimiter, pipelineLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import articleRoutes from './modules/articles/article.routes';
import * as pipelineController from './modules/pipeline/pipeline.controller';
import * as articleController from './modules/articles/article.controller';

const app = express();

/**
 * Custom Mongo Sanitize Middleware
 */
const mongoSanitize = (obj: any): any => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        mongoSanitize(obj[key]);
      }
    }
  }
  return obj;
};

const sanitizeMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.body) mongoSanitize(req.body);
  if (req.query) mongoSanitize(req.query);
  if (req.params) mongoSanitize(req.params);
  next();
};

// Health check mounted before global rate limiter
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    secret_hint: env!.PIPELINE_SECRET ? `${env!.PIPELINE_SECRET.slice(0, 3)}...` : 'missing'
  });
});

// 1. Helmet – security headers
app.use(helmet());

// 2. CORS – allow all for diagnostics
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// 3. Body parser limit
app.use(express.json({ limit: '10kb' }));

// 4. Mongo Sanitize
app.use(sanitizeMiddleware);

// 5. Rate Limiting
app.use('/api', globalLimiter);
app.post('/api/pipeline/run', pipelineLimiter, pipelineController.runPipeline);
app.get('/api/pipeline/status', pipelineController.getStatus);
app.post('/api/pipeline/process/:id', pipelineController.processArticle);

// 6. Logging
if (env!.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 7. Routes
app.get('/api/stats', articleController.getStats); // Direct access for dashboard
app.use('/api/articles', articleRoutes);

// 8. Error handler (must be last)
app.use(errorHandler);

export default app;
