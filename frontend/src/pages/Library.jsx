import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Search } from 'lucide-react';
import { getUserId } from '../helper/userID';

export default function Library() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const userId = getUserId();
  const [loading, setLoading] = useState(true);

  const fetchHistory = async (q = '') => {
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`http://localhost:4000/history${params}`, {
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
      await fetch(`http://localhost:4000/history/${id}`, { method: 'DELETE' });
      fetchHistory(search);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 to-indigo-950/30 -z-10" />
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-3xl font-bold">Library</h2>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search downloads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-400 text-center">No downloads yet.</p>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                {entry.thumbnail && (
                  <img
                    src={entry.thumbnail}
                    alt={entry.title}
                    className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.title || 'Untitled'}</p>
                  <p className="text-xs text-gray-500">
                    {entry.format.toUpperCase()} {entry.quality && `• ${entry.quality}`} • {entry.downloaded_at}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={`http://localhost:4000/download-again/${entry.id}`}
                    download
                    className="p-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 transition-colors"
                    title="Download again"
                  >
                    <Download className="w-4 h-4 text-green-400" />
                  </a>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
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