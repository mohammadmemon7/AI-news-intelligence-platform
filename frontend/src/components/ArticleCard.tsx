import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  ExternalLink, 
  ChevronDown, 
  Share2, 
  Bookmark, 
  RotateCcw,
  CheckCircle2,
  BrainCircuit,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Article } from '../types/article';
import { processArticle } from '../lib/api';

// Blocklist of junk strings that come from NewsData.io free tier or failed Groq responses
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

const getCleanSummary = (article: Article): string | null => {
  if (!isJunkText(article.ai_summary)) return article.ai_summary!;
  if (!isJunkText(article.description)) return article.description!;
  return null;
};

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article: initialArticle }) => {
  const [article, setArticle] = useState(initialArticle);
  // Each card manages its OWN expanded state — completely independent
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Ref for measuring the insights list height for smooth animation
  const insightsRef = useRef<HTMLDivElement>(null);
  const [insightsHeight, setInsightsHeight] = useState(0);

  // Measure the natural height of the insights list whenever it changes
  useEffect(() => {
    if (insightsRef.current) {
      setInsightsHeight(insightsRef.current.scrollHeight);
    }
  }, [article.ai_insights, isExpanded]);

  const handleToggleInsights = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/article/${article._id}`);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  const handleReprocess = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProcessError(null);
    try {
      setIsProcessing(true);
      const res = await processArticle(article._id);
      if (res.success) {
        setArticle(res.data);
      } else {
        setProcessError('Analysis failed. Try again.');
      }
    } catch (err: any) {
      console.error('Failed to re-process:', err);
      setProcessError(err.response?.data?.error?.message || 'Connection error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'Positive': return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'Negative': return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
      default: return 'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <div className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 flex flex-col">
      {/* Top Section: Metadata & Actions */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <Globe size={12} className="text-blue-500" />
            <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-md">{article.source_name || 'Global News'}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className={`p-2 rounded-full transition-all ${shareCopied ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600'}`}
            >
              {shareCopied ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
            </button>
            <button 
              onClick={handleBookmark}
              className={`p-2 rounded-full transition-all ${isBookmarked ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-amber-600'}`}
            >
              <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <Link to={`/article/${article._id}`}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {article.title}
          </h2>
        </Link>

        {/* AI Content Section */}
        <div className="space-y-4">
          {article.ai_processed && !article.ai_failed ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-tighter ${getSentimentColor(article.ai_sentiment)}`}>
                  {article.ai_sentiment || 'Neutral'}
                </span>
                {article.ai_impact_score && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 uppercase tracking-tighter">
                    Impact: {article.ai_impact_score}/10
                  </span>
                )}
                {article.ai_sentiment === 'Positive' && <span className="text-xs">🚀</span>}
                {article.ai_sentiment === 'Negative' && <span className="text-xs">⚠️</span>}
              </div>

              {/* AI Summary — filters out junk "paid plan" and "unavailable" text */}
              {(() => {
                const summary = getCleanSummary(article);
                return summary ? (
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 italic">
                    "{summary}"
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-sm italic">
                    AI summary being generated...
                  </p>
                );
              })()}

              {/* Collapsible Insights — each card is independent */}
              {(() => {
                const cleanInsights = (article.ai_insights || []).filter(
                  (insight) =>
                    !isJunkText(insight) &&
                    !insight.toLowerCase().includes('unable') &&
                    !insight.toLowerCase().includes('unavailable')
                );
                if (cleanInsights.length === 0) return null;
                return (
                <div className="pt-2">
                  <button
                    onClick={handleToggleInsights}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    {isExpanded ? 'Hide insights' : 'Show insights'}
                    <span className="ml-1 text-[10px] text-gray-400 font-normal">
                      ({cleanInsights.length})
                    </span>
                  </button>
                  
                  {/* Animated height container */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isExpanded ? `${insightsHeight + 16}px` : '0px' }}
                  >
                    <div ref={insightsRef}>
                      <ul className="mt-3 space-y-2">
                        {cleanInsights.map((insight, idx) => (
                          <li key={idx} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* Source link — replaces any "paid plan" messaging */}
              {article.source_url && (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-1"
                >
                  Read original source <ExternalLink size={10} />
                </a>
              )}
            </>
          ) : (
            <div className={`rounded-2xl p-4 border flex flex-col items-center text-center space-y-3 ${article.ai_failed ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
              <div className={`p-2 rounded-full animate-pulse ${article.ai_failed ? 'bg-white dark:bg-rose-900/30 text-rose-500' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>
                {article.ai_failed ? <AlertTriangle size={24} /> : <BrainCircuit size={24} />}
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-bold uppercase tracking-wider ${article.ai_failed ? 'text-rose-900 dark:text-rose-100' : 'text-slate-900 dark:text-slate-100'}`}>
                  {article.ai_failed ? 'AI Analysis Failed' : 'AI Analysis Pending'}
                </p>
                <p className={`text-[11px] ${article.ai_failed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                  {article.ai_failed ? (article.ai_error_message || 'Click below to try again.') : 'Insights will be available shortly.'}
                </p>
              </div>
              <button
                onClick={handleReprocess}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${article.ai_failed ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <RotateCcw size={12} className={isProcessing ? 'animate-spin' : ''} />
                {isProcessing ? 'Processing...' : (article.ai_failed ? 'RETRY ANALYSIS' : 'RE-PROCESS NOW')}
              </button>
              {processError && <p className="text-[10px] text-rose-500 font-bold">{processError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-auto p-6 pt-0">
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6" />
        <div className="flex items-center justify-between">
          <Link 
            to={`/article/${article._id}`}
            className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            Read Full Intelligence
            <ExternalLink size={14} />
          </Link>
          <a 
            href={article.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-blue-600 transition-all"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
