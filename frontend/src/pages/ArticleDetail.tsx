import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ChevronLeft, 
  Globe, 
  BrainCircuit, 
  Calendar, 
  ExternalLink, 
  Share2, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { getArticle } from '../lib/api';
import type { Article } from '../types/article';

// Blocklist of junk strings from NewsData.io free tier or failed Groq responses
const JUNK_PATTERNS = [
  'paid plan', 'paid subscription', 'available in paid',
  'analysis unavailable', 'unavailable', 'not available',
  'upgrade to', 'subscribe to', 'premium only'
];

const isJunkText = (text?: string | null): boolean => {
  if (!text || text.trim().length < 10) return true;
  const lower = text.toLowerCase();
  return JUNK_PATTERNS.some(pattern => lower.includes(pattern));
};

interface ArticleDetailProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ isDark, toggleTheme }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await getArticle(id);
        if (res.success) {
          setArticle(res.data);
        } else {
          setError('Article not found.');
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load article details.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
    window.scrollTo(0, 0);
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const getSentimentInfo = (sentiment?: string) => {
    switch (sentiment) {
      case 'Positive': return { 
        icon: <TrendingUp size={16} />, 
        label: 'Positive', 
        styles: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
      };
      case 'Negative': return { 
        icon: <TrendingDown size={16} />, 
        label: 'Negative', 
        styles: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' 
      };
      default: return { 
        icon: <Minus size={16} />, 
        label: 'Neutral', 
        styles: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700' 
      };
    }
  };

  if (loading) return <div className="min-h-screen dark:bg-gray-950"><Navbar isDark={isDark} toggleTheme={toggleTheme} /><div className="mt-20"><Loader /></div></div>;
  if (error || !article) return <div className="min-h-screen dark:bg-gray-950"><Navbar isDark={isDark} toggleTheme={toggleTheme} /><div className="max-w-4xl mx-auto px-4 mt-20"><ErrorMessage message={error || 'Article not found'} onRetry={() => window.location.reload()} /></div></div>;

  const sentiment = getSentimentInfo(article.ai_sentiment);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-8 group uppercase tracking-widest"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <article className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-blue-500/5 overflow-hidden">
          {/* Header Section */}
          <div className="p-8 sm:p-12 border-b border-gray-50 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border shadow-sm ${sentiment.styles}`}>
                {sentiment.icon}
                {sentiment.label} AI Analysis
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <Calendar size={14} className="text-blue-500" />
                {format(new Date(article.published_at), 'MMMM dd, yyyy • HH:mm')}
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] mb-8">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-8 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                  <Globe size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Publisher</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{article.source_name || 'Global Source'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleShare}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm border ${
                    shareCopied 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  {shareCopied ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
                  {shareCopied ? 'Copied!' : 'Share'}
                </button>
                {article.source_url && (
                  <a 
                    href={article.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <ExternalLink size={18} />
                    View Original
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Main Content */}
            <div className="lg:col-span-8 p-8 sm:p-12 space-y-12">
              {!isJunkText(article.ai_summary) && (
                <section className="relative">
                  <div className="absolute -left-12 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full hidden sm:block"></div>
                  <h2 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em] mb-6">AI Executive Summary</h2>
                  <div className="bg-blue-50/30 dark:bg-blue-900/10 p-8 rounded-[2rem] border border-blue-100/50 dark:border-blue-800/30">
                    <p className="text-xl sm:text-2xl text-gray-800 dark:text-gray-200 leading-relaxed italic font-medium">
                      "{article.ai_summary}"
                    </p>
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-6">Article Overview</h2>
                <div className="prose dark:prose-invert prose-blue max-w-none text-gray-600 dark:text-gray-400 leading-[1.8] text-lg">
                  {(() => {
                    const content = article.content;
                    const desc = article.description;
                    if (!isJunkText(content)) return content;
                    if (!isJunkText(desc)) return desc;
                    return 'Visit the original source for the complete article.';
                  })()}
                </div>
                {article.source_url && (
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                  >
                    <ExternalLink size={14} />
                    Read full article on {article.source_name || 'original source'}
                  </a>
                )}
              </section>
            </div>

            {/* Sidebar Insights */}
            <aside className="lg:col-span-4 bg-gray-50/50 dark:bg-gray-800/30 border-l border-gray-50 dark:border-gray-800 p-8 sm:p-12 space-y-12">
              {article.ai_insights && article.ai_insights.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-3 text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] mb-8">
                    <BrainCircuit size={20} className="text-blue-600" />
                    Key Intelligence
                  </h2>
                  <ul className="space-y-6">
                    {article.ai_insights.map((insight, idx) => (
                      <li key={idx} className="group flex gap-4">
                        <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-xs font-black text-blue-600 dark:text-blue-400 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                          {insight}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {article.category && article.category.length > 0 && (
                <section>
                  <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-6">Classifications</h2>
                  <div className="flex flex-wrap gap-2">
                    {article.category.map(cat => (
                      <span key={cat} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-100 dark:hover:border-blue-900 transition-all cursor-default uppercase tracking-wider">
                        #{cat}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </article>
      </main>
    </div>
  );
};

export default ArticleDetail;
