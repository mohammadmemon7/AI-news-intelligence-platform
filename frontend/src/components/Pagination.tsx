import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) => {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const showMax = 5;

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, idx) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${idx}`} className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500">
            <MoreHorizontal size={16} />
          </span>
        );
      }

      return (
        <button
          key={page}
          onClick={() => onPageChange(page as number)}
          disabled={disabled || currentPage === page}
          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all shadow-sm ${
            currentPage === page
              ? 'bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900/50 shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-12 py-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-2">
        {renderPageNumbers()}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default Pagination;
