import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  return (
    <div className="relative group w-full max-w-2xl">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
        <Search size={20} />
      </div>
      <input
        type="text"
        className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl leading-5 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-400 transition-all text-gray-900 dark:text-white shadow-sm"
        placeholder="Search for keywords, companies, or events..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
