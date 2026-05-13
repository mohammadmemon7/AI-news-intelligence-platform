import { Request, Response, NextFunction } from 'express';
import { articleService } from './article.service';

export const getArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = req.query;
    const { articles, pagination } = await articleService.getArticles(filters);

    res.status(200).json({
      success: true,
      data: articles,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getArticleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const article = await articleService.getArticleById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await articleService.getStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
