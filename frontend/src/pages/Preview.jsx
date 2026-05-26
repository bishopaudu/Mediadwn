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
  Subtitles,
  User, Eye, HardDrive, Clock
} from 'lucide-react';
import { getUserId } from '../helper/userID';
import API_BASE from '../config';

const Section = ({ label, icon: Icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
        {label}
      </span>
    </div>
    {children}
  </div>
);

const getEstimatedSize = (info, format, quality) => {
  if (!info) return null;
  const duration = info.duration;
  const baseSize = info.filesize_approx;

  if (format === 'mp3') {
    if (duration) {
      return duration * 24000; // ~192kbps
    }
    if (baseSize) {
      return baseSize * 0.12; // Audio portion
    }
    return null;
  }

  // MP4
  if (baseSize) {
    if (quality === '360p') return baseSize * 0.3;
    if (quality === '720p') return baseSize;
    if (quality === '1080p') return baseSize * 1.8;
    return baseSize;
  }

  if (duration) {
    if (quality === '360p') return duration * 62500;
    if (quality === '720p') return duration * 187500;
    if (quality === '1080p') return duration * 437500;
  }

  return null;
};

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, url } = location.state || {};

  const [info, setInfo]               = useState(null);
  const [playlist, setPlaylist]       = useState(null);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [format, setFormat]           = useState('mp4');
  const [quality, setQuality]         = useState('720p');
  const [error, setError]             = useState('');
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted]         = useState(false);

  const estimatedSize = getEstimatedSize(info, format, quality);

  const [customFilename, setCustomFilename] = useState('');
  const [speedLimit, setSpeedLimit]         = useState('unlimited');
  const [startTime, setStartTime]           = useState('');
  const [endTime, setEndTime]               = useState('');
  const [embedSubs, setEmbedSubs]           = useState(false);
  const [subLangs, setSubLangs]             = useState('en');

  const formatDuration = (seconds) => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatViews = (count) => {
  if (!count) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};


  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!data) { navigate('/'); return; }
    if (Array.isArray(data)) setPlaylist(data);
    else setInfo(data);
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
    if (selectedUrls.size === playlist.length) setSelectedUrls(new Set());
    else setSelectedUrls(new Set(playlist.map((e) => e.url)));
  };

  const handleDownloadSingle = async () => {
    if (!info) return;
    setDownloading(true);
    setError('');
    const userId = getUserId();
    try {
      const res = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
        body: JSON.stringify({
          url,
          format,
          quality: format === 'mp4' ? quality : undefined,
          custom_filename: customFilename || undefined,
          speed_limit: speedLimit,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          embed_subs: embedSubs,
          sub_langs: subLangs || undefined,
          title: info.title || undefined,
          thumbnail: info.thumbnail || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Download failed');
      const { job_id } = await res.json();
      navigate(`/progress?job_id=${job_id}&title=${encodeURIComponent(info.title || '')}&format=${format}`);
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
      const jobIds = [];
      for (const u of Array.from(selectedUrls)) {
        const entry = playlist.find((e) => e.url === u);
        const res = await fetch(`${API_BASE}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
          body: JSON.stringify({
            url: u, format,
            quality: format === 'mp4' ? quality : undefined,
            speed_limit: speedLimit,
            start_time: startTime || undefined,
            end_time: endTime || undefined,
            embed_subs: embedSubs,
            sub_langs: subLangs || undefined,
            title: entry?.title,
          }),
        });
        if (!res.ok) throw new Error((await res.text()) || `Download failed for ${u}`);
        const { job_id } = await res.json();
        jobIds.push(job_id);
      }
      navigate(`/batch-progress?job_ids=${jobIds.join(',')}&format=${format}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  
  /* ─── helpers ─── */

  const inputClass =
    "w-full px-4 py-2.5 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all duration-200";

  /* ─── active/inactive pill styles ─── */
  const activeBtn  = "bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white scale-[1.02] shadow-md shadow-blue-500/20";
  const inactiveBtn = "bg-white/60 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.07]";

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300">

      {/* ── Animated gradient background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-slate-100 to-blue-50 dark:from-[#030a14] dark:via-gray-950 dark:to-[#030d1a] -z-10" />

      {/* ── Floating orbs ── */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── Noise / grain overlay ── */}
      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.06] -z-10 pointer-events-none"
           style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* ── Nav ── */}
      <nav
        className="relative z-10 flex items-center px-8 py-6 max-w-3xl mx-auto w-full"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors duration-200 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Back
        </button>
      </nav>

      {/* ── Content ── */}
      <div
        className="relative z-10 max-w-3xl mx-auto w-full px-8 pb-20 space-y-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.55s ease 0.08s, transform 0.55s ease 0.08s',
        }}
      >

        {/* ── Thumbnail card ── */}
        <div className="preview-card-in rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl shadow-xl dark:shadow-black/30">
          {info && !playlist && info.thumbnail ? (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-indigo-50/50 dark:bg-indigo-500/[0.04] flex flex-col items-center justify-center gap-3">
              <Video className="w-10 h-10 text-indigo-300 dark:text-indigo-500/60" />
              <span className="text-sm text-slate-400 dark:text-gray-500">
                {playlist ? `Playlist · ${playlist.length} videos` : 'No preview available'}
              </span>
            </div>
          )}

          {info && !playlist && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.08]">
              <h2 className="font-bold text-xl leading-snug text-slate-900 dark:text-white">
                {info.title}
              </h2>

              {/* info pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {info.uploader && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                    <User className="w-3 h-3" />
                    {info.uploader}
                  </span>
                )}
                {info.duration && (
                  <>
                    <span className="text-slate-300 dark:text-white/20">·</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDuration(info.duration)}
                    </span>
                  </>
                )}
                {info.view_count && (
                  <>
                    <span className="text-slate-300 dark:text-white/20">·</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                      <Eye className="w-3 h-3" />
                      {formatViews(info.view_count)}
                    </span>
                  </>
                )}
                {estimatedSize && (
                  <>
                    <span className="text-slate-300 dark:text-white/20">·</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
                      <HardDrive className="w-3 h-3" />
                      ~{formatSize(estimatedSize)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Playlist selector ── */}
        {playlist && (
          <div
            className="preview-card-in rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl shadow-xl dark:shadow-black/30 overflow-hidden"
            style={{ animationDelay: '80ms' }}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                  Playlist
                </h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                  {selectedUrls.size} of {playlist.length} selected
                </p>
              </div>
              <button
                onClick={toggleAll}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors duration-200 cursor-pointer"
              >
                {selectedUrls.size === playlist.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {playlist.map((entry, i) => {
                const isSelected = selectedUrls.has(entry.url);
                return (
                  <button
                    key={i}
                    onClick={() => toggleUrl(entry.url)}
                    className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all duration-200 border-b border-slate-100 dark:border-white/[0.04] last:border-0 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-l-indigo-400 dark:border-l-indigo-500'
                        : 'hover:bg-white/80 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className={`flex-shrink-0 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}>
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        : <Square className="w-4 h-4 text-slate-300 dark:text-gray-600" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-slate-900 dark:text-white">
                        {entry.title}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 truncate">
                        {entry.url}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Options card ── */}
        <div
          className="preview-card-in rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-2xl shadow-xl dark:shadow-black/30 divide-y divide-slate-100 dark:divide-white/[0.06]"
          style={{ animationDelay: '140ms' }}
        >

          {/* Format */}
          <div className="px-6 py-5">
            <Section label="Format">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'mp4', label: 'MP4 Video', icon: Video, estSize: getEstimatedSize(info, 'mp4', quality) },
                  { id: 'mp3', label: 'MP3 Audio', icon: Music, estSize: getEstimatedSize(info, 'mp3', quality) },
                ].map(({ id, label, icon: Icon, estSize }) => (
                  <button
                    key={id}
                    onClick={() => setFormat(id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                      format === id ? activeBtn : inactiveBtn
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                    {estSize && (
                      <span className={`text-xs ${format === id ? 'text-white/80' : 'text-slate-400 dark:text-gray-500'}`}>
                        ~{formatSize(estSize)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          {/* Quality */}
          {format === 'mp4' && (
            <div className="px-6 py-5">
              <Section label="Quality">
                <div className="grid grid-cols-3 gap-2">
                  {['360p', '720p', '1080p'].map((q) => {
                    const estSize = getEstimatedSize(info, 'mp4', q);
                    return (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer ${
                          quality === q ? activeBtn : inactiveBtn
                        }`}
                      >
                        <span className="text-sm">{q}</span>
                        {estSize && (
                          <span className={`text-[10px] mt-0.5 ${quality === q ? 'text-white/80' : 'text-slate-400 dark:text-gray-500'}`}>
                            ~{formatSize(estSize)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}

          {/* Subtitles */}
          {format === 'mp4' && (
            <div className="px-6 py-5">
              <Section label="Subtitles" icon={Subtitles}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setEmbedSubs(!embedSubs)}
                    className={`w-10 h-5 rounded-full transition-colors duration-300 relative flex-shrink-0 cursor-pointer ${
                      embedSubs ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-gray-700/60'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      embedSubs ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-gray-300 select-none">
                    Embed subtitles in video
                  </span>
                </label>
                {embedSubs && (
                  <div className="flex items-center gap-3 mt-3 pl-[52px] animate-fade-in">
                    <span className="text-xs text-slate-400 dark:text-gray-500">Language</span>
                    <input
                      type="text"
                      value={subLangs}
                      onChange={(e) => setSubLangs(e.target.value)}
                      placeholder="en"
                      className="w-20 px-3 py-1.5 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all duration-200"
                    />
                    <span className="text-xs text-slate-400 dark:text-gray-500">e.g. en, fr, es</span>
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* Custom filename */}
          {!playlist && info && (
            <div className="px-6 py-5">
              <Section label="Custom Filename" icon={FileText}>
                <input
                  type="text"
                  placeholder="my-video  (leave blank for auto)"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className={inputClass}
                />
              </Section>
            </div>
          )}

          {/* Speed limit */}
          <div className="px-6 py-5">
            <Section label="Speed Limit" icon={Gauge}>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: 'unlimited', label: '∞' },
                  { val: '1M',        label: '1 MB/s' },
                  { val: '5M',        label: '5 MB/s' },
                  { val: '10M',       label: '10 MB/s' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setSpeedLimit(val)}
                    className={`py-2 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer ${
                      speedLimit === val ? activeBtn : inactiveBtn
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          {/* Trim */}
          {format === 'mp4' && (
            <div className="px-6 py-5">
              <Section label="Trim Video" icon={Scissors}>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Start  00:00:00"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="End  00:01:30"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                  Leave blank to download the full video.
                </p>
              </Section>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl animate-shake">
            <span className="text-red-500 text-xs mt-0.5">⚠</span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ── Download button — single ── */}
        {info && !playlist && (
          <div className="preview-card-in" style={{ animationDelay: '200ms' }}>
            <button
              id="download-btn"
              onClick={handleDownloadSingle}
              disabled={downloading}
              className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 group cursor-pointer active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-opacity duration-300" />
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Starting download…</>
                ) : (
                  <>
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />
                    Download {format.toUpperCase()} {estimatedSize ? `(~${formatSize(estimatedSize)})` : ''}
                  </>
                )}
              </span>
            </button>
          </div>
        )}

        {/* ── Download button — batch ── */}
        {playlist && (
          <div className="preview-card-in" style={{ animationDelay: '200ms' }}>
            <button
              id="batch-download-btn"
              onClick={handleBatchDownload}
              disabled={downloading || selectedUrls.size === 0}
              className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 group cursor-pointer active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-opacity duration-300" />
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Starting {selectedUrls.size} download(s)…</>
                ) : (
                  <><Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />Download {selectedUrls.size} Selected</>
                )}
              </span>
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes preview-card-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .preview-card-in {
          animation: preview-card-in 0.5s ease-out both;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.25s ease-out both;
        }
      `}</style>
    </main>
  );
}
