import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
      <div className="bg-red-100 p-3 rounded-full text-red-600">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-red-900">Something went wrong</h3>
        <p className="text-red-700 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
        >
          <RefreshCw size={18} />
          Retry Now
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
