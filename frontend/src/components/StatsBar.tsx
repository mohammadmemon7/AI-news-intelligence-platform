import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';

interface StatsBarProps {
  stats: {
    total: number;
    sentiment: { Positive: number; Negative: number; Neutral: number };
  } | null;
  loading: boolean;
}

// Custom hook for counting animation
const useCountUp = (endValue: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - percentage, 4);
      setCount(Math.floor(endValue * easeProgress));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return count;
};

const AnimatedNumber: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const count = useCountUp(value, 1500);
  return <span>{count}{suffix}</span>;
};

const StatsBar: React.FC<StatsBarProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 animate-pulse"></div>
        ))}
      </div>
    );
  }

  const { total, sentiment } = stats;
  const getPercentage = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

  const statItems = [
    {
      label: 'Total Analyzed',
      value: total,
      icon: <BarChart3 size={24} />,
      color: 'blue',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Positive Sentiment',
      value: getPercentage(sentiment.Positive),
      isPercent: true,
      count: sentiment.Positive,
      icon: <TrendingUp size={24} />,
      color: 'emerald',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      progress: getPercentage(sentiment.Positive),
    },
    {
      label: 'Negative Sentiment',
      value: getPercentage(sentiment.Negative),
      isPercent: true,
      count: sentiment.Negative,
      icon: <TrendingDown size={24} />,
      color: 'rose',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      text: 'text-rose-600 dark:text-rose-400',
      progress: getPercentage(sentiment.Negative),
    },
    {
      label: 'Neutral Context',
      value: getPercentage(sentiment.Neutral),
      isPercent: true,
      count: sentiment.Neutral,
      icon: <Minus size={24} />,
      color: 'slate',
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      text: 'text-slate-600 dark:text-slate-400',
      progress: getPercentage(sentiment.Neutral),
    },
  ];

  return (
    <div className="mb-8">
      {/* Combined Sentiment Progress Bar */}
      <div className="mb-6 bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">Global Mood</span>
        <div className="flex-1 h-3 rounded-full flex overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-800">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${getPercentage(sentiment.Positive)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-emerald-500" 
            title={`Positive: ${getPercentage(sentiment.Positive)}%`}
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${getPercentage(sentiment.Neutral)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-slate-400 dark:bg-slate-600" 
            title={`Neutral: ${getPercentage(sentiment.Neutral)}%`}
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${getPercentage(sentiment.Negative)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-rose-500" 
            title={`Negative: ${getPercentage(sentiment.Negative)}%`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            key={item.label} 
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${item.bg} ${item.text} p-3 rounded-2xl shadow-inner`}>
                {item.icon}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.label}</span>
                <p className={`text-3xl font-black mt-1 ${item.label === 'Total Analyzed' ? 'text-gray-900 dark:text-white' : item.text}`}>
                  <AnimatedNumber value={item.value as number} suffix={item.isPercent ? '%' : ''} />
                </p>
              </div>
            </div>
            
            {item.progress !== undefined && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex justify-between items-center">
                  <span>{item.count} articles</span>
                  <span className={item.text}>Trend</span>
                </p>
              </div>
            )}
            
            {item.label === 'Total Analyzed' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Real-time tracking active
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StatsBar;
