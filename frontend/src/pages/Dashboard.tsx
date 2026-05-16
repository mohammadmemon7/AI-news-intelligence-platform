import React, { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { CSVLink } from 'react-csv';
import Navbar from '../components/Navbar';
import StatsBar from '../components/StatsBar';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import ArticleList from '../components/ArticleList';
import Pagination from '../components/Pagination';
import ErrorMessage from '../components/ErrorMessage';
import { getArticles, getStats, runPipeline, getPipelineStatus } from '../lib/api';
import type { Article, Pagination as PaginationType, StatsResponse } from '../types/article';

interface DashboardProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ isDark, toggleTheme }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [stats, setStats] = useState<StatsResponse['data'] | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    sentiment: '',
    date_from: '',
    date_to: '',
    sort_by: '-published_at',
    page: 1,
    limit: 12,
  });

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getArticles(filters);
      if (res.success) {
        setArticles(res.data);
        setPagination(res.pagination);
      } else {
        setError('Failed to load articles. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Connection error. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = async () => {
    console.log('Refresh Feed Button Clicked!');
    try {
      setRefreshing(true);
      const res = await runPipeline(); 
      console.log('Pipeline run response:', res);
      
      // If already running, we still want to poll until it finishes
      if (res && (res as any).data?.message?.includes('Already running')) {
          console.log('Pipeline is already active, starting polling...');
      }

      // Poll /api/pipeline/status every 3s
      const pollUntilDone = async () => {
        const MAX_POLLS = 100; 
        let polls = 0;
        while (polls < MAX_POLLS) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          try {
            const status = await getPipelineStatus();
            if (!status.data?.isRunning) {
              if (status.data?.lastRunStatus?.rateLimited) {
                setError('News source rate limit reached. Using existing articles for now. Please wait 15 minutes.');
              }
              break; // pipeline finished
            }
          polls++;
        }
        fetchArticles();
        fetchStats();
        setRefreshing(false);
      };

      pollUntilDone();
    } catch (err: any) {
      console.error('Pipeline error:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Pipeline failed to start.';
      setError(`Pipeline Error: ${msg}. Check if your PIPELINE_SECRET is correct on both Render and Vercel.`);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const res = await getPipelineStatus();
        if (res.data?.isRunning) {
          setRefreshing(true);
          // Start polling, but DON'T trigger a new run
          const pollUntilDone = async () => {
            const MAX_POLLS = 60;
            let polls = 0;
            while (polls < MAX_POLLS) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              const status = await getPipelineStatus();
              if (!status.data?.isRunning) break;
              polls++;
            }
            fetchArticles();
            fetchStats();
            setRefreshing(false);
          };
          pollUntilDone();
        }
      } catch (err) { /* ignore */ }
    };
    checkInitialStatus();
  }, []);

  const handleSearch = useCallback((search: string) => {
    setFilters(prev => {
      if (prev.search === search) return prev;
      return { ...prev, search, page: 1 };
    });
  }, []);

  const handleApplyFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => {
      const isChanged = Object.entries(newFilters).some(([key, value]) => (prev as any)[key] !== value);
      if (!isChanged) return prev;
      return { ...prev, ...newFilters, page: 1 };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sentiment: '',
      date_from: '',
      date_to: '',
      page: 1
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Prepare data for CSV export
  const csvHeaders = [
    { label: "Title", key: "title" },
    { label: "Source", key: "source_name" },
    { label: "Published Date", key: "published_at" },
    { label: "AI Sentiment", key: "ai_sentiment" },
    { label: "AI Summary", key: "ai_summary" },
    { label: "AI Insights", key: "ai_insights" }
  ];
  const csvData = articles.map(a => ({
    ...a,
    ai_insights: a.ai_insights?.join('; ') || ''
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar onRefresh={handleRefresh} isRefreshing={refreshing} isDark={isDark} toggleTheme={toggleTheme} />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
              Intelligence <span className="text-blue-600 dark:text-blue-500">Feed</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-2xl">
              Real-time, AI-powered news monitoring and sentiment analysis platform. Tracking global trends and extracting key insights automatically.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <CSVLink 
              data={csvData} 
              headers={csvHeaders}
              filename={`intelligence-export-${new Date().toISOString().split('T')[0]}.csv`}
              className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-bold text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm group"
            >
              <Download size={18} className="text-blue-600 dark:text-blue-400 group-hover:-translate-y-1 transition-transform" />
              Export to CSV
            </CSVLink>
          </div>
        </header>

        <StatsBar stats={stats} loading={statsLoading} />

        <div className="flex flex-col md:flex-row gap-4 mb-10 sticky top-20 z-30 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md py-4 border-b border-transparent dark:border-gray-800/50 transition-colors">
          <SearchBar onSearch={handleSearch} initialValue={filters.search} />
          <FilterPanel 
            onApply={handleApplyFilters} 
            onClear={handleClearFilters}
            initialFilters={{
              sentiment: filters.sentiment,
              date_from: filters.date_from,
              date_to: filters.date_to
            }}
          />
        </div>

        {error ? (
          <ErrorMessage message={error} onRetry={fetchArticles} />
        ) : (
          <>
            <ArticleList articles={articles} loading={loading} />
            
            {pagination && (
              <Pagination
                currentPage={filters.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                disabled={loading}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-12 mt-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} News Intelligence Platform. Powered by Datastraw & Groq.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
