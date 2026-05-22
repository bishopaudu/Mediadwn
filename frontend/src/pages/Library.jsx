import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Search } from 'lucide-react';
import { getUserId } from '../helper/userID';
import API_BASE from '../config';

export default function Library() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const userId = getUserId();
  const [loading, setLoading] = useState(true);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const fetchHistory = async (q = '') => {
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`${API_BASE}/history${params}`, {
    headers: { 'X-User-ID': userId },
  });
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(search);
  }, [search]);

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/history/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': userId },
      });
      fetchHistory(search);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 relative transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 -z-10" />
      <div className="w-full max-w-4xl mx-auto space-y-8 text-slate-900 dark:text-white">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-3xl font-bold">Library</h2>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search downloads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-md"
          />
        </div>

        {loading ? (
          <p className="text-slate-500 dark:text-gray-400">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-500 dark:text-gray-400 text-center">No downloads yet.</p>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 bg-white/60 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 shadow-sm dark:shadow-none backdrop-blur-md transition-colors"
              >
                {entry.thumbnail && (
                  <img
                    src={entry.thumbnail}
                    alt={entry.title}
                    className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-slate-900 dark:text-white">{entry.title || 'Untitled'}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    {entry.format.toUpperCase()} {entry.quality && `• ${entry.quality}`} • {formatDate(entry.downloaded_at)}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={`${API_BASE}/download-again/${entry.id}?user_id=${userId}`}
                    download
                    className="p-2 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-600/20 dark:hover:bg-green-600/30 transition-colors cursor-pointer"
                    title="Download again"
                  >
                    <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </a>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-600/20 dark:hover:bg-red-600/30 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}