import { Article, IArticle } from './article.model';

export const articleService = {
  getArticles: async (filters: any) => {
    const { page, limit, search, sentiment, date_from, date_to, sort_by } = filters;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      // Using $text for search as per rules section 9 text index
      query.$text = { $search: search };
    }

    if (sentiment) {
      query.ai_sentiment = sentiment;
    }

    if (date_from || date_to) {
      query.published_at = {};
      if (date_from) query.published_at.$gte = new Date(date_from);
      if (date_to) query.published_at.$lte = new Date(date_to);
    }

    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort({ [sort_by]: -1 })
        .skip(skip)
        .limit(limit),
      Article.countDocuments(query),
    ]);

    return {
      articles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getArticleById: async (id: string) => {
    return Article.findById(id);
  },

  getStats: async () => {
    const [total, sentimentStats, categoryStats] = await Promise.all([
      Article.countDocuments(),
      Article.aggregate([
        { $group: { _id: '$ai_sentiment', count: { $sum: 1 } } }
      ]),
      Article.aggregate([
        { $unwind: '$category' },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const sentiment: Record<string, number> = { Positive: 0, Negative: 0, Neutral: 0 };
    sentimentStats.forEach((stat) => {
      if (stat._id) sentiment[stat._id] = stat.count;
    });

    const by_category: Record<string, number> = {};
    categoryStats.forEach((stat) => {
      by_category[stat._id] = stat.count;
    });

    return {
      total,
      sentiment,
      by_category
    };
  }
};
