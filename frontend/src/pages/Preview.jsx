import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Video,
  Music,
  Loader2,
  CheckSquare,
  Square,
  Scissors,
  Gauge,
  FileText,
} from 'lucide-react';
import { getUserId } from '../helper/userID';   // make sure file name matches

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, url } = location.state || {};

  const [info, setInfo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('720p');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Phase 1 features
  const [customFilename, setCustomFilename] = useState('');
  const [speedLimit, setSpeedLimit] = useState('unlimited');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

 // const [writeSubs, setWriteSubs] = useState(false);
const [embedSubs, setEmbedSubs] = useState(false);
const [subLangs, setSubLangs] = useState('auto');

  useEffect(() => {
    if (!data) {
      navigate('/');
      return;
    }
    if (Array.isArray(data)) {
      setPlaylist(data);
    } else {
      setInfo(data);
    }
  }, [data, navigate]);

  const toggleUrl = (entryUrl) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      next.has(entryUrl) ? next.delete(entryUrl) : next.add(entryUrl);
      return next;
    });
  };

  const toggleAll = () => {
    if (!playlist) return;
    if (selectedUrls.size === playlist.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(playlist.map((entry) => entry.url)));
    }
  };

  const handleDownloadSingle = async () => {
    if (!info) return;
    setDownloading(true);
    setError('');
    const userId = getUserId();
    try {
      const res = await fetch('http://localhost:4000/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          url: url,
          format,
          quality: format === 'mp4' ? quality : undefined,
          custom_filename: customFilename || undefined,
          speed_limit: speedLimit,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          //write_subs: writeSubs,
          embed_subs: embedSubs,
          sub_langs: subLangs || undefined,
          title: info.title || undefined,
          thumbnail: info.thumbnail || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Download failed');
      }
      const { job_id } = await res.json();
      navigate(
        `/progress?job_id=${job_id}&title=${encodeURIComponent(
          info.title || ''
        )}&format=${format}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleBatchDownload = async () => {
    if (!playlist || selectedUrls.size === 0) return;
    setDownloading(true);
    setError('');
    const userId = getUserId();
    try {
      const urls = Array.from(selectedUrls);
      const jobIds = [];
      for (const url of urls) {
        const entry = playlist.find((e) => e.url === url);
        const res = await fetch('http://localhost:4000/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId,
          },
          body: JSON.stringify({
            url,
            format,
            quality: format === 'mp4' ? quality : undefined,
            speed_limit: speedLimit,
            start_time: startTime || undefined,
            end_time: endTime || undefined,
           // write_subs: writeSubs,
            embed_subs: embedSubs,
            sub_langs: subLangs || undefined,
            title: entry ? entry.title : undefined,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Download failed for ${url}`);
        }
        const { job_id } = await res.json();
        jobIds.push(job_id);
      }
      navigate(
        `/batch-progress?job_ids=${jobIds.join(',')}&format=${format}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 relative transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-indigo-50/30 dark:from-gray-950 dark:to-indigo-950/30 -z-10" />
      <div className="w-full max-w-2xl space-y-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="backdrop-blur-xl bg-white/60 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
          {/* Thumbnail / header */}
          {info && !playlist && info.thumbnail ? (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-slate-200 dark:bg-gray-800 flex items-center justify-center">
              <Video className="w-12 h-12 text-slate-400 dark:text-gray-600" />
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Title / playlist selection */}
            {info && !playlist && (
              <h2 className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">{info.title}</h2>
            )}

            {playlist && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Select videos to download ({selectedUrls.size}/{playlist.length})
                  </h2>
                  <button
                    onClick={toggleAll}
                    className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {selectedUrls.size === playlist.length ? (
                      <>
                        <Square className="w-4 h-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Select All
                      </>
                    )}
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
                  {playlist.map((entry, i) => {
                    const isSelected = selectedUrls.has(entry.url);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleUrl(entry.url)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/10 dark:bg-indigo-600/20 border border-indigo-300 dark:border-indigo-500/50'
                            : 'hover:bg-slate-100/50 dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate text-slate-900 dark:text-white">
                            {entry.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-gray-500 mt-1 truncate">
                            {entry.url}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Format selector (FIXED – actual buttons) */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-500 dark:text-gray-400">Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('mp4')}
                  className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-all cursor-pointer ${
                    format === 'mp4'
                      ? 'bg-indigo-500/15 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500/50 text-indigo-700 dark:text-white font-semibold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  MP4 Video
                </button>
                <button
                  onClick={() => setFormat('mp3')}
                  className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-all cursor-pointer ${
                    format === 'mp3'
                      ? 'bg-purple-500/15 dark:bg-purple-600/20 border-purple-400 dark:border-purple-500/50 text-purple-700 dark:text-white font-semibold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Music className="w-5 h-5" />
                  MP3 Audio
                </button>
              </div>
            </div>

            {/* Quality selector (FIXED – actual buttons) */}
            {format === 'mp4' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-500 dark:text-gray-400">Quality</label>
                <div className="grid grid-cols-3 gap-3">
                  {['360p', '720p', '1080p'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`py-3 rounded-xl border transition-all cursor-pointer ${
                        quality === q
                          ? 'bg-indigo-500/15 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500/50 text-indigo-700 dark:text-white font-semibold'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Subtitle Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-500 dark:text-gray-400">Subtitles</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embedSubs}
                    onChange={(e) => setEmbedSubs(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-gray-300">Embed in video</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-gray-400">Languages:</span>
                <input
                  type="text"
                  value={subLangs}
                  onChange={(e) => setSubLangs(e.target.value)}
                  placeholder="auto"
                  className="w-24 px-3 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 dark:text-gray-500">e.g. en, fr, -en</span>
              </div>
            </div>

            {/* ---------- Phase 1 features ---------- */}

            {/* Custom Filename (single video only) */}
            {!playlist && info && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Custom Filename (optional)
                </label>
                <input
                  type="text"
                  placeholder="my-video"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-gray-500">Leave blank for auto‑name.</p>
              </div>
            )}

            {/* Speed Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Speed Limit
              </label>
              <select
                value={speedLimit}
                onChange={(e) => setSpeedLimit(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="unlimited" className="bg-white dark:bg-gray-950 text-slate-900 dark:text-white">Unlimited</option>
                <option value="1M" className="bg-white dark:bg-gray-950 text-slate-900 dark:text-white">1 MB/s</option>
                <option value="5M" className="bg-white dark:bg-gray-950 text-slate-900 dark:text-white">5 MB/s</option>
                <option value="10M" className="bg-white dark:bg-gray-950 text-slate-900 dark:text-white">10 MB/s</option>
              </select>
            </div>

            {/* Clip / Trim (only for MP4) */}
            {format === 'mp4' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  Trim Video (optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Start (00:00:00)"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="End (00:01:30)"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-500">Leave blank for full video.</p>
              </div>
            )}

            {/* Download buttons */}
            {info && !playlist && (
              <button
                onClick={handleDownloadSingle}
                disabled={downloading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-white shadow-lg shadow-indigo-600/15 dark:shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting download...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download
                  </>
                )}
              </button>
            )}

            {playlist && (
              <button
                onClick={handleBatchDownload}
                disabled={downloading || selectedUrls.size === 0}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-white shadow-lg shadow-indigo-600/15 dark:shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting {selectedUrls.size} download(s)...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download {selectedUrls.size} Selected
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="p-4 bg-red-100/50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/30 rounded-xl text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.4);
          border-radius: 2px;
        }
      `}</style>
    </main>
  );
}


