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
  const Section = ({ label, icon: Icon, children }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#6B6B6B] dark:text-[#888]" />}
        <span className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] dark:text-[#888] font-['DM_Sans',_sans-serif]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );

  const inputClass =
    "w-full px-4 py-2.5 bg-[#F5F4F0] dark:bg-[#1A1A18] border border-[#E0DDD8] dark:border-[#2A2A28] rounded-xl text-[#1A1A1A] dark:text-[#E8E8E6] placeholder:text-[#B0ADA8] dark:placeholder:text-[#444] font-['DM_Sans',_sans-serif] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all duration-200";

  /* ─── active/inactive pill styles ─── */
  const activeBtn  = "bg-[#1A1A1A] dark:bg-[#E8E8E6] border-[#1A1A1A] dark:border-[#E8E8E6] text-white dark:text-[#0F0F0E] scale-[1.02] shadow-md";
  const inactiveBtn = "bg-[#F5F4F0] dark:bg-[#1A1A18] border-[#E0DDD8] dark:border-[#2A2A28] text-[#6B6B6B] dark:text-[#888] hover:border-[#C8B8A2] dark:hover:border-[#555] hover:bg-[#ECEAE6] dark:hover:bg-[#222]";

  return (
    <main className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#E8E8E6] font-['DM_Sans',_sans-serif]">

      {/* ── Subtle grid ── */}
      <div
        className="fixed inset-0 opacity-[0.022] dark:opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* ── Floating orbs (subtle, preview-page colours) ── */}
      <div className="fixed top-[-80px] right-[-80px] w-[420px] h-[420px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'float-orb 14s ease-in-out infinite' }} />
      <div className="fixed bottom-[-60px] left-[-60px] w-[340px] h-[340px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'float-orb 18s ease-in-out infinite reverse', animationDelay: '-5s' }} />

      {/* ── Nav ── */}
      <nav
        className="relative z-10 flex items-center px-8 py-6 max-w-3xl mx-auto"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-[#6B6B6B] dark:text-[#888] hover:text-[#1A1A1A] dark:hover:text-[#E8E8E6] transition-colors duration-200 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Back
        </button>
      </nav>

      {/* ── Content ── */}
      <div
        className="relative z-10 max-w-3xl mx-auto px-8 pb-20 space-y-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.55s ease 0.08s, transform 0.55s ease 0.08s',
        }}
      >

        {/* ── Thumbnail card ── */}
        <div className="preview-card-in rounded-2xl overflow-hidden border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm">
          {info && !playlist && info.thumbnail ? (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-[#F0EDE8] dark:bg-[#1A1A18] flex flex-col items-center justify-center gap-3">
              <Video className="w-10 h-10 text-[#C8B8A2] dark:text-[#3A3530]" />
              <span className="text-sm text-[#B0ADA8] dark:text-[#444]">
                {playlist ? `Playlist · ${playlist.length} videos` : 'No preview available'}
              </span>
            </div>
          )}

         {/* {info && !playlist && (
            <div className="px-6 py-4 border-t border-[#E0DDD8] dark:border-[#2A2A28]">
              <h2 className="font-['Fraunces',_serif] font-bold text-xl leading-snug text-[#1A1A1A] dark:text-[#E8E8E6]">
                {info.title}
              </h2>
            </div>
          )} */}
          {info && !playlist && (
  <div className="px-6 py-4 border-t border-[#E0DDD8] dark:border-[#2A2A28]">
    <h2 className="font-['Fraunces',_serif] font-bold text-xl leading-snug text-[#1A1A1A] dark:text-[#E8E8E6]">
      {info.title}
    </h2>

    {/* ADD THIS — info pills */}
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {info.uploader && (
        <span className="flex items-center gap-1.5 text-xs text-[#6B6B6B] dark:text-[#888]">
          <User className="w-3 h-3" />
          {info.uploader}
        </span>
      )}
      {info.duration && (
        <>
          <span className="text-[#E0DDD8] dark:text-[#2A2A28]">·</span>
          <span className="flex items-center gap-1.5 text-xs text-[#6B6B6B] dark:text-[#888]">
            <Clock className="w-3 h-3" />
            {formatDuration(info.duration)}
          </span>
        </>
      )}
      {info.view_count && (
        <>
          <span className="text-[#E0DDD8] dark:text-[#2A2A28]">·</span>
          <span className="flex items-center gap-1.5 text-xs text-[#6B6B6B] dark:text-[#888]">
            <Eye className="w-3 h-3" />
            {formatViews(info.view_count)}
          </span>
        </>
      )}
      {info.filesize_approx && (
        <>
          <span className="text-[#E0DDD8] dark:text-[#2A2A28]">·</span>
          <span className="flex items-center gap-1.5 text-xs text-[#6B6B6B] dark:text-[#888]">
            <HardDrive className="w-3 h-3" />
            ~{formatSize(info.filesize_approx)}
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
            className="preview-card-in rounded-2xl border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm overflow-hidden"
            style={{ animationDelay: '80ms' }}
          >
            <div className="px-6 py-4 border-b border-[#E0DDD8] dark:border-[#2A2A28] flex items-center justify-between">
              <div>
                <h2 className="font-['Fraunces',_serif] font-bold text-lg text-[#1A1A1A] dark:text-[#E8E8E6]">
                  Playlist
                </h2>
                <p className="text-sm text-[#6B6B6B] dark:text-[#888] mt-0.5">
                  {selectedUrls.size} of {playlist.length} selected
                </p>
              </div>
              <button
                onClick={toggleAll}
                className="text-xs font-semibold text-[#1A1A1A] dark:text-[#E8E8E6] bg-[#F0EDE8] dark:bg-[#2A2A28] px-3 py-1.5 rounded-lg hover:bg-[#E8E4DE] dark:hover:bg-[#333] transition-colors duration-200 cursor-pointer"
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
                    className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all duration-200 border-b border-[#F0EDE8] dark:border-[#1A1A18] last:border-0 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-l-indigo-400 dark:border-l-indigo-500'
                        : 'hover:bg-[#F8F6F2] dark:hover:bg-[#1F1F1D]'
                    }`}
                  >
                    <div className={`flex-shrink-0 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}>
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        : <Square className="w-4 h-4 text-[#C8B8A2] dark:text-[#3A3530]" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-[#1A1A1A] dark:text-[#E8E8E6]">
                        {entry.title}
                      </div>
                      <div className="text-xs text-[#B0ADA8] dark:text-[#444] mt-0.5 truncate">
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
          className="preview-card-in rounded-2xl border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm divide-y divide-[#F0EDE8] dark:divide-[#2A2A28]"
          style={{ animationDelay: '140ms' }}
        >

          {/* Format */}
          <div className="px-6 py-5">
            <Section label="Format">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'mp4', label: 'MP4 Video', icon: Video },
                  { id: 'mp3', label: 'MP3 Audio', icon: Music },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setFormat(id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                      format === id ? activeBtn : inactiveBtn
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
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
                  {['360p', '720p', '1080p'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                        quality === q ? activeBtn : inactiveBtn
                      }`}
                    >
                      {q}
                    </button>
                  ))}
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
                      embedSubs ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-[#E0DDD8] dark:bg-[#2A2A28]'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      embedSubs ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-[#1A1A1A] dark:text-[#E8E8E6] select-none">
                    Embed subtitles in video
                  </span>
                </label>
                {embedSubs && (
                  <div className="flex items-center gap-3 mt-3 pl-[52px] animate-fade-in">
                    <span className="text-xs text-[#6B6B6B] dark:text-[#888]">Language</span>
                    <input
                      type="text"
                      value={subLangs}
                      onChange={(e) => setSubLangs(e.target.value)}
                      placeholder="en"
                      className="w-20 px-3 py-1.5 bg-[#F5F4F0] dark:bg-[#1A1A18] border border-[#E0DDD8] dark:border-[#2A2A28] rounded-lg text-[#1A1A1A] dark:text-[#E8E8E6] text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
                    />
                    <span className="text-xs text-[#B0ADA8] dark:text-[#444]">e.g. en, fr, es</span>
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
                <p className="text-xs text-[#B0ADA8] dark:text-[#444] mt-1">
                  Leave blank to download the full video.
                </p>
              </Section>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl animate-shake">
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
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-300" />
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Starting download…</>
                ) : (
                  <><Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />Download {format.toUpperCase()}</>
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
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-300" />
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');

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
