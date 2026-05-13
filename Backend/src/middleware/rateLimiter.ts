import { rateLimit } from 'express-rate-limit';

/**
 * Global rate limiter for all /api routes.
 * 200 requests per minute as per rules section 5.5.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for pipeline run endpoint.
 * 5 requests per minute as per rules section 5.5.
 */
export const pipelineLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Pipeline run limit exceeded. Please wait a minute.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
