import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Search, Film, Music, Clock, X } from 'lucide-react';
import { getUserId } from '../helper/userID';
import API_BASE from '../config';

export default function Library() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const userId = getUserId();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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
    setMounted(true);
    fetchHistory(search);
  }, [search]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await fetch(`${API_BASE}/history/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': userId },
      });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#E8E8E6] font-['DM_Sans',_sans-serif]">

      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-[0.025] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-[#6B6B6B] dark:text-[#888] hover:text-[#1A1A1A] dark:hover:text-[#E8E8E6] transition-colors duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#1A1A1A] dark:bg-[#E8E8E6] rounded-sm flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-[#FAFAF8] dark:bg-[#0F0F0E] rounded-[2px]" />
          </div>
          <span className="font-['Fraunces',_serif] font-bold text-base tracking-tight">mediadwn</span>
        </div>
      </nav>

      <div
        className="relative z-10 max-w-4xl mx-auto px-8 pb-16"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.5s ease',
        }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-['Fraunces',_serif] font-black text-4xl text-[#1A1A1A] dark:text-[#E8E8E6]">
            Library
          </h1>
          <p className="text-sm text-[#6B6B6B] dark:text-[#888] mt-1">
            {entries.length > 0 ? `${entries.length} download${entries.length !== 1 ? 's' : ''}` : 'Your download history'}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0ADA8] dark:text-[#444]" />
          <input
            type="text"
            placeholder="Search by title or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-[#1A1A18] border border-[#E0DDD8] dark:border-[#2A2A28] rounded-xl text-[#1A1A1A] dark:text-[#E8E8E6] placeholder:text-[#B0ADA8] dark:placeholder:text-[#444] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] dark:focus:ring-[#E8E8E6] focus:ring-offset-1 transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0ADA8] dark:text-[#444] hover:text-[#1A1A1A] dark:hover:text-[#E8E8E6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-6 h-6 border-2 border-[#E0DDD8] dark:border-[#2A2A28] border-t-[#1A1A1A] dark:border-t-[#E8E8E6] rounded-full animate-spin" />
            <p className="text-sm text-[#6B6B6B] dark:text-[#888]">Loading your library...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0EDE8] dark:bg-[#1A1A18] border border-[#E0DDD8] dark:border-[#2A2A28] flex items-center justify-center">
              <Film className="w-7 h-7 text-[#C8B8A2] dark:text-[#3A3530]" />
            </div>
            <div>
              <p className="font-['Fraunces',_serif] font-bold text-lg text-[#1A1A1A] dark:text-[#E8E8E6]">
                {search ? 'No results found' : 'Nothing here yet'}
              </p>
              <p className="text-sm text-[#6B6B6B] dark:text-[#888] mt-1">
                {search ? `No downloads matching "${search}"` : 'Your downloaded files will appear here.'}
              </p>
            </div>
            {!search && (
              <button
                onClick={() => navigate('/')}
                className="mt-2 px-5 py-2.5 bg-[#1A1A1A] dark:bg-[#E8E8E6] text-white dark:text-[#0F0F0E] rounded-xl text-sm font-medium hover:bg-[#333] dark:hover:bg-white transition-colors"
              >
                Download something
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm overflow-hidden divide-y divide-[#F0EDE8] dark:divide-[#2A2A28]">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8F6F2] dark:hover:bg-[#1F1F1D] transition-colors group"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                  transition: `all 0.4s ease ${i * 0.04}s`,
                }}
              >
                {/* Thumbnail or format icon */}
                <div className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-[#F0EDE8] dark:bg-[#2A2A28] flex items-center justify-center">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt={entry.title}
                      className="w-full h-full object-cover"
                    />
                  ) : entry.format === 'mp3' ? (
                    <Music className="w-6 h-6 text-[#C8B8A2] dark:text-[#3A3530]" />
                  ) : (
                    <Film className="w-6 h-6 text-[#C8B8A2] dark:text-[#3A3530]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#E8E8E6] truncate">
                    {entry.title || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 bg-[#F0EDE8] dark:bg-[#2A2A28] rounded-md font-medium text-[#6B6B6B] dark:text-[#888]">
                      {entry.format?.toUpperCase()}
                    </span>
                    {entry.quality && (
                      <span className="text-xs px-2 py-0.5 bg-[#F0EDE8] dark:bg-[#2A2A28] rounded-md font-medium text-[#6B6B6B] dark:text-[#888]">
                        {entry.quality}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[#B0ADA8] dark:text-[#444]">
                      <Clock className="w-3 h-3" />
                      {formatDate(entry.downloaded_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`${API_BASE}/download-again/${entry.id}?user_id=${userId}`}
                    download
                    title="Download again"
                    className="p-2 rounded-lg bg-[#F0EDE8] dark:bg-[#2A2A28] hover:bg-[#E8E4DE] dark:hover:bg-[#333] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#6B6B6B] dark:text-[#888]" />
                  </a>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete"
                    className="p-2 rounded-lg bg-[#F0EDE8] dark:bg-[#2A2A28] hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                  >
                    {deletingId === entry.id ? (
                      <div className="w-4 h-4 border-2 border-[#E0DDD8] border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-[#6B6B6B] dark:text-[#888] group-hover:text-red-500 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
      `}</style>
    </main>
  );
}

/*import { useState, useEffect } from 'react';
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
}*/