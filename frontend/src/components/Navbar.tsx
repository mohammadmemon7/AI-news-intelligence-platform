import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw, Sun, Moon, Activity } from 'lucide-react';
import { getPipelineStatus } from '../lib/api';

interface NavbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isDark: boolean;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onRefresh, isRefreshing, isDark, toggleTheme }) => {
  const [pipelineRunning, setPipelineRunning] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getPipelineStatus();
        if (res.success) {
          setPipelineRunning(res.data.isRunning);
        }
      } catch (err) {
        // Silently fail for status check
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-blue-200 dark:shadow-blue-900 shadow-lg">
                <Newspaper size={22} />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                News Intelligence
              </span>
            </Link>

            {pipelineRunning && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold animate-pulse">
                <Activity size={12} />
                <span className="hidden sm:inline">PIPELINE ACTIVE</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin text-blue-600' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="hidden sm:inline">Refresh Feed</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
