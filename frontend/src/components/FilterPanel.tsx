import React, { useState } from 'react';
import { Filter, Calendar, XCircle, CheckCircle2 } from 'lucide-react';

interface FilterState {
  sentiment: string;
  date_from: string;
  date_to: string;
}

interface FilterPanelProps {
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  initialFilters: FilterState;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onApply, onClear, initialFilters }) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onApply(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared = { sentiment: '', date_from: '', date_to: '' };
    setLocalFilters(cleared);
    onClear();
    setIsOpen(false);
  };

  const hasActiveFilters = localFilters.sentiment || localFilters.date_from || localFilters.date_to;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-medium transition-all shadow-sm ${
          hasActiveFilters 
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter size={18} />
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-40 p-6 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Advanced Filters</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sentiment Analysis</label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'Positive', 'Negative', 'Neutral'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setLocalFilters({ ...localFilters, sentiment: s === 'All' ? '' : s })}
                      className={`px-3 py-2 text-sm font-bold rounded-xl border transition-all ${
                        (s === 'All' && !localFilters.sentiment) || s === localFilters.sentiment
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date Range</label>
                <div className="space-y-3">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="date"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={localFilters.date_from}
                      onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="date"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={localFilters.date_to}
                      onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <CheckCircle2 size={16} />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
