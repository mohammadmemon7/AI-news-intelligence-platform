import { Router } from 'express';
import * as articleController from './article.controller';
import { validate } from '../../middleware/validate';
import { getArticlesSchema, getArticleByIdSchema } from './article.schema';

const router = Router();

router.get(
  '/',
  validate(getArticlesSchema),
  articleController.getArticles
);

router.get(
  '/stats',
  articleController.getStats
);

router.get(
  '/:id',
  validate(getArticleByIdSchema),
  articleController.getArticleById
);

export default router;
