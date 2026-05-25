import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Download, CheckCircle2, XCircle, Loader2,
  ArrowLeft, Share2, Copy, Check, Clock
} from 'lucide-react';
import { getUserId } from '../helper/userID';
import API_BASE from '../config';

const STATUS_CONFIG = {
  pending: {
    label: 'Preparing your download',
    sub: 'Getting things ready…',
    color: '#6B6B6B',
    ringColor: '#C8C4BE',
    darkRingColor: '#3A3A38',
  },
  processing: {
    label: 'Downloading',
    sub: 'Fetching and converting your file…',
    color: '#4F46E5',
    ringColor: '#4F46E5',
    darkRingColor: '#6366F1',
  },
  done: {
    label: 'Ready',
    sub: 'Your file is ready to download.',
    color: '#16a34a',
    ringColor: '#16a34a',
    darkRingColor: '#22c55e',
  },
  failed: {
    label: 'Something went wrong',
    sub: null,
    color: '#dc2626',
    ringColor: '#dc2626',
    darkRingColor: '#ef4444',
  },
};

export default function Progress() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const job_id = searchParams.get('job_id');
  const title  = searchParams.get('title');
  const format = searchParams.get('format');

  const [status, setStatus]           = useState('pending');
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState('');
  const [shareLink, setShareLink]     = useState('');
  const [showShare, setShowShare]     = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [mounted, setMounted]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [isDark, setIsDark]           = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!job_id) { navigate('/'); return; }

    const timer    = setInterval(() => setElapsed(e => e + 1), 1000);
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`${API_BASE}/status/${job_id}`);
        if (!res.ok) throw new Error('Job not found');
        const data = await res.json();
        setStatus(data.status);
        setProgress(data.progress);
        if (data.error) setError(data.error);
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(interval);
          clearInterval(timer);
        }
      } catch (e) {
        setError(e.message);
        clearInterval(interval);
        clearInterval(timer);
      }
    }, 1000);

    return () => { clearInterval(interval); clearInterval(timer); };
  }, [job_id, navigate]);

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const userId = getUserId();
      const res = await fetch(`${API_BASE}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
        body: JSON.stringify({ job_id, expires_in_hours: 24 }),
      });
      if (!res.ok) throw new Error('Failed to generate share link');
      const data = await res.json();
      setShareLink(data.url);
      setShowShare(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const cfg      = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isActive = status === 'pending' || status === 'processing';
  const radius   = 40;
  const circ     = 2 * Math.PI * radius;
  const dash     = circ - (progress / 100) * circ;

  /* ring colour picks dark variant when in dark mode */
  const ringStroke = isDark ? cfg.darkRingColor : cfg.ringColor;

  return (
    <main className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#E8E8E6] font-['DM_Sans',_sans-serif]">

      {/* ── Grid background ── */}
      <div
        className="fixed inset-0 opacity-[0.022] dark:opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* ── Floating orbs ── */}
      <div className="fixed top-[-100px] right-[-80px] w-[380px] h-[380px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', filter: 'blur(70px)', animation: 'float-orb 13s ease-in-out infinite' }} />
      <div className="fixed bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)', filter: 'blur(70px)', animation: 'float-orb 17s ease-in-out infinite reverse', animationDelay: '-6s' }} />

      {/* ── Nav ── */}
      <nav
        className="relative z-10 flex items-center px-8 py-6 max-w-lg mx-auto"
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

      {/* ── Main card ── */}
      <div
        className="relative z-10 max-w-lg mx-auto px-8 pb-16"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.55s ease 0.1s, transform 0.55s ease 0.1s',
        }}
      >
        <div className="rounded-2xl border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm overflow-hidden">

          {/* ── Top: ring + labels + bar ── */}
          <div className="px-8 py-10 flex flex-col items-center text-center space-y-6 border-b border-[#F0EDE8] dark:border-[#2A2A28]">

            {/* SVG ring */}
            <div className="relative w-28 h-28">
              {/* Glow behind ring when processing */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-full transition-opacity duration-700"
                  style={{
                    background: `radial-gradient(circle, ${ringStroke}18 0%, transparent 70%)`,
                    filter: 'blur(10px)',
                    opacity: status === 'processing' ? 1 : 0,
                  }}
                />
              )}

              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                {/* Track */}
                <circle cx="48" cy="48" r={radius} fill="none" strokeWidth="6"
                  className="text-[#F0EDE8] dark:text-[#2A2A28]" stroke="currentColor" />
                {/* Progress arc */}
                <circle
                  cx="48" cy="48" r={radius} fill="none" strokeWidth="6"
                  stroke={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={isActive ? dash : 0}
                  style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
                />
              </svg>

              {/* Centre icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {status === 'done' && (
                  <CheckCircle2 className="w-10 h-10" style={{ color: cfg.color, animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }} />
                )}
                {status === 'failed' && (
                  <XCircle className="w-10 h-10" style={{ color: cfg.color, animation: 'popIn 0.3s ease' }} />
                )}
                {isActive && (
                  <div className="text-center">
                    <div className="text-xl font-bold tabular-nums" style={{ color: cfg.color }}>
                      {progress}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1">
              <h2 className="font-['Fraunces',_serif] font-bold text-2xl text-[#1A1A1A] dark:text-[#E8E8E6]">
                {cfg.label}
              </h2>
              {cfg.sub && (
                <p className="text-sm text-[#6B6B6B] dark:text-[#888]">{cfg.sub}</p>
              )}
              {title && (
                <p className="text-xs text-[#B0ADA8] dark:text-[#444] truncate max-w-xs mx-auto mt-1">
                  {decodeURIComponent(title)}
                </p>
              )}
            </div>

            {/* Progress bar */}
            {isActive && (
              <div className="w-full space-y-1.5">
                <div className="w-full h-1.5 bg-[#F0EDE8] dark:bg-[#2A2A28] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${progress}%`,
                      background: status === 'processing'
                        ? 'linear-gradient(90deg, #4F46E5, #7C3AED)'
                        : '#C8C4BE',
                    }}
                  >
                    {/* shimmer sweep on bar */}
                    {status === 'processing' && (
                      <span className="absolute inset-0 animate-bar-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#B0ADA8] dark:text-[#444]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(elapsed)}
                  </span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom: actions ── */}
          <div className="px-8 py-6 space-y-3">

            {status === 'done' && (
              <>
                {/* Download file button */}
                <a
                  href={`${API_BASE}/file/${job_id}`}
                  download
                  className="relative w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white overflow-hidden group transition-all duration-200 active:scale-[0.98]"
                  style={{ animation: 'fadeSlideIn 0.4s ease both' }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600" />
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="relative flex items-center gap-2">
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-200" />
                    Download {format?.toUpperCase()}
                  </span>
                </a>

                {/* Share */}
                {!showShare ? (
                  <button
                    onClick={handleShare}
                    disabled={shareLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#F5F4F0] dark:bg-[#1A1A18] hover:bg-[#EEEAE4] dark:hover:bg-[#222] border border-[#E0DDD8] dark:border-[#2A2A28] rounded-xl text-[#6B6B6B] dark:text-[#888] hover:text-[#1A1A1A] dark:hover:text-[#E8E8E6] text-sm font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    style={{ animation: 'fadeSlideIn 0.4s ease 0.08s both' }}
                  >
                    {shareLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                      : <><Share2 className="w-4 h-4" />Generate Share Link</>}
                  </button>
                ) : (
                  <div className="space-y-2" style={{ animation: 'fadeSlideIn 0.3s ease both' }}>
                    <p className="text-xs text-[#6B6B6B] dark:text-[#888]">
                      Share link — <span className="text-[#B0ADA8] dark:text-[#444]">expires in 24h</span>
                    </p>
                    <div className="flex items-center gap-2 bg-[#F5F4F0] dark:bg-[#1A1A18] border border-[#E0DDD8] dark:border-[#2A2A28] px-4 py-2.5 rounded-xl">
                      <input
                        readOnly
                        value={shareLink}
                        className="flex-1 bg-transparent text-[#1A1A1A] dark:text-[#E8E8E6] text-sm outline-none truncate"
                      />
                      <button
                        onClick={handleCopy}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] dark:bg-[#E8E8E6] hover:bg-[#333] dark:hover:bg-white text-white dark:text-[#0F0F0E] rounded-lg text-xs font-medium transition-colors duration-200 cursor-pointer"
                      >
                        {copied
                          ? <><Check className="w-3 h-3" />Copied!</>
                          : <><Copy className="w-3 h-3" />Copy</>}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {status === 'failed' && (
              <>
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl animate-shake">
                  <span className="text-red-500 text-xs mt-0.5">⚠</span>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error || 'Something went wrong during processing.'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-[#F5F4F0] dark:bg-[#1A1A18] hover:bg-[#EEEAE4] dark:hover:bg-[#222] border border-[#E0DDD8] dark:border-[#2A2A28] rounded-xl text-sm font-medium text-[#1A1A1A] dark:text-[#E8E8E6] transition-colors duration-200 cursor-pointer"
                >
                  Try Again
                </button>
              </>
            )}

            {isActive && (
              <p className="text-center text-xs text-[#B0ADA8] dark:text-[#444]">
                You can close this tab — your download will continue in the background.
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes bar-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }

        .animate-bar-shimmer {
          animation: bar-shimmer 1.6s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
