
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import API_BASE from '../config';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Analysis failed');
      }
      const data = await res.json();
      navigate('/preview', { state: { data, url } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden transition-colors duration-300">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-slate-100 to-purple-50 dark:from-indigo-950 dark:via-gray-950 dark:to-purple-950 -z-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-300 bg-clip-text text-transparent">
            mediadwn
          </h1>
          <p className="text-lg text-slate-600 dark:text-gray-400 max-w-md mx-auto">
            Paste any video link and save it offline. Clean, fast, local.
          </p>
        </div>

        {/* Input card with glass effect */}
        <div className="backdrop-blur-xl bg-white/60 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Paste video or playlist URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="w-full pl-12 pr-4 py-4 bg-white/80 dark:bg-gray-900/80 border border-slate-300 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-400/10 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold text-white shadow-lg shadow-indigo-600/15 dark:shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/library')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer"
          >
            View Library
          </button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm text-slate-500 dark:text-gray-500">
          <div className="space-y-1">
            <div className="text-slate-800 dark:text-white font-medium">MP4 + MP3</div>
            <div>Video & audio</div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-800 dark:text-white font-medium">Up to 1080p</div>
            <div>Quality choice</div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-800 dark:text-white font-medium">Local only</div>
            <div>No cloud</div>
          </div>
        </div>
      </div>
    </main>
  );
}

