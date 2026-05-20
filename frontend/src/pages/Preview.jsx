import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, url } = location.state || {};

  const [info, setInfo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState(url || '');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('720p');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!data) {
      navigate('/');
      return;
    }
    if (Array.isArray(data)) {
      setPlaylist(data);
      setSelectedUrl(data[0]?.url || '');
    } else {
      setInfo(data);
      setSelectedUrl(url);
    }
  }, [data, url, navigate]);

  const handleDownload = async () => {
    if (!selectedUrl) return;
    setError('');
    try {
      const res = await fetch('http://localhost:4000/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: selectedUrl,
          format,
          quality: format === 'mp4' ? quality : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Download request failed');
      }
      const { job_id } = await res.json();
      navigate(`/progress?job_id=${job_id}&title=${encodeURIComponent(info?.title || playlist?.find(e => e.url === selectedUrl)?.title || '')}&format=${format}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <button onClick={() => navigate('/')} className="text-indigo-400 hover:underline">&larr; Back</button>

        {playlist && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Select a video from playlist</h2>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {playlist.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedUrl(entry.url)}
                  className={`w-full text-left px-3 py-2 rounded-lg ${selectedUrl === entry.url ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'} text-white`}
                >
                  {entry.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {info && !playlist && (
          <div className="space-y-4">
            {info.thumbnail && (
              <img src={info.thumbnail} alt={info.title} className="w-full rounded-xl aspect-video object-cover" />
            )}
            <h2 className="text-2xl font-bold">{info.title}</h2>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => setFormat('mp4')}
              className={`flex-1 py-3 rounded-lg font-semibold ${format === 'mp4' ? 'bg-indigo-600' : 'bg-gray-800'} text-white`}
            >
              MP4 (Video)
            </button>
            <button
              onClick={() => setFormat('mp3')}
              className={`flex-1 py-3 rounded-lg font-semibold ${format === 'mp3' ? 'bg-indigo-600' : 'bg-gray-800'} text-white`}
            >
              MP3 (Audio)
            </button>
          </div>

          {format === 'mp4' && (
            <div className="flex gap-3">
              {['360p', '720p', '1080p'].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 py-2 rounded-lg text-sm ${quality === q ? 'bg-indigo-600' : 'bg-gray-800'} text-white`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-white"
        >
          Download
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </main>
  );
}