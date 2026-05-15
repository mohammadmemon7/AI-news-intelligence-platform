import React from 'react';
import ArticleCard from './ArticleCard';
import { SkeletonCard } from './Loader';
import type { Article } from '../types/article';
import { Ghost } from 'lucide-react';

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full text-gray-400 dark:text-gray-500 mb-6 shadow-inner">
          <Ghost size={48} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No articles found</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          We couldn't find any news matching your current filters. Try adjusting your search or sentiment criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
      {articles.map((article) => (
        <ArticleCard key={article._id} article={article} />
      ))}
    </div>
  );
};

export default ArticleList;
