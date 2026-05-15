import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ArticleDetail from './pages/ArticleDetail';

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard isDark={isDark} toggleTheme={toggleTheme} />} />
        <Route path="/article/:id" element={<ArticleDetail isDark={isDark} toggleTheme={toggleTheme} />} />
      </Routes>
    </Router>
  );
}

export default App;
