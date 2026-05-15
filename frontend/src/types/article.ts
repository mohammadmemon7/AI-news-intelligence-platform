export interface Article {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  source_url?: string;
  source_name?: string;
  published_at: string;
  category?: string[];
  country?: string[];
  ai_summary?: string;
  ai_sentiment?: 'Positive' | 'Negative' | 'Neutral';
  ai_insights?: string[];
  ai_processed: boolean;
  fetched_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ArticlesResponse {
  success: boolean;
  data: Article[];
  pagination: Pagination;
}

export interface StatsResponse {
  success: boolean;
  data: {
    total: number;
    sentiment: { Positive: number; Negative: number; Neutral: number };
    by_category: Record<string, number>;
  };
}

export interface GetArticlesParams {
  page?: number;
  limit?: number;
  search?: string;
  sentiment?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
}
