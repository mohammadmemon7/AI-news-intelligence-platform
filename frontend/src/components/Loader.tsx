import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">Loading intelligence...</p>
    </div>
  );
};

export default Loader;

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
      </div>
      <div className="h-8 bg-gray-50 dark:bg-gray-800 rounded w-full mt-4"></div>
    </div>
  );
};
