import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowRight, Film, Music, Zap, Shield, BookOpen, Sparkles } from 'lucide-react';
import API_BASE from '../config';

const features = [
  { icon: Film,     label: 'MP4 Video',    sub: 'Up to 1080p' },
  { icon: Music,    label: 'MP3 Audio',    sub: 'High quality' },
  { icon: Zap,      label: 'Fast',         sub: 'Powered by yt-dlp' },
  { icon: Shield,   label: 'No tracking',  sub: 'Your data stays yours' },
];

const supportedSites = [
  {
    name: 'YouTube',
    glowColor: 'rgba(239, 68, 68, 0.2)',
    hoverBg: 'hover:bg-red-600',
    hoverBorder: 'hover:border-red-600',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  {
    name: 'TikTok',
    glowColor: 'rgba(0, 242, 254, 0.2)',
    hoverBg: 'hover:bg-black hover:dark:bg-zinc-950',
    hoverBorder: 'hover:border-zinc-800 hover:dark:border-zinc-800',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.57-1.01V15.5c0 1.42-.4 2.87-1.21 3.98-1.54 2.21-4.47 3.19-7.02 2.4-2.58-.75-4.41-3.26-4.45-5.96-.07-2.88 2.03-5.59 4.9-6.07 1-.18 2.04-.1 3 .21v4.1c-.81-.36-1.74-.43-2.58-.09-1.07.41-1.76 1.57-1.68 2.71.07 1.25.99 2.37 2.23 2.53 1.34.2 2.73-.55 3.17-1.84.14-.42.19-.87.19-1.31V.02z"/>
      </svg>
    )
  },
  {
    name: 'Instagram',
    glowColor: 'rgba(225, 48, 108, 0.2)',
    hoverBg: 'hover:bg-[#E1306C]',
    hoverBorder: 'hover:border-[#E1306C]',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    )
  },
  {
    name: 'Twitter / X',
    glowColor: 'rgba(29, 161, 242, 0.2)',
    hoverBg: 'hover:bg-[#1DA1F2]',
    hoverBorder: 'hover:border-[#1DA1F2]',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
  {
    name: 'Facebook',
    glowColor: 'rgba(24, 119, 242, 0.2)',
    hoverBg: 'hover:bg-[#1877F2]',
    hoverBorder: 'hover:border-[#1877F2]',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  },
  {
    name: 'SoundCloud',
    glowColor: 'rgba(255, 85, 0, 0.2)',
    hoverBg: 'hover:bg-[#FF5500]',
    hoverBorder: 'hover:border-[#FF5500]',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M1.059 13.784c-.035-.38-.059-.769-.059-1.171 0-.961.166-1.854.469-2.658-.337-.123-.71-.183-1.096-.15-.224.019-.373.18-.373.405v6.529c0 .243.197.432.44.409.349-.033.682-.128.981-.274a5.076 5.076 0 0 1-.362-3.09zm2.464 2.871c.218.083.454.128.699.128h.081V9.336H3.8c-.092 0-.173.05-.213.131-.486.994-.741 2.164-.741 3.403 0 1.157.22 2.234.646 3.167.067.147.218.257.387.279.169.022.338-.073.4-.241v-.421zm1.745.128h.781V8.65h-.781v7.133zm2.531 0h.781V8.293h-.781v7.49zm2.532.001c.214 0 .42-.047.611-.129.17-.073.28-.242.28-.426v-7.85c0-.18-.106-.346-.271-.422a1.036 1.036 0 0 0-.62-.112c-.172.019-.318.146-.356.314l-.066.29c-.066.289-.101.59-.101.901v7.434h.523zm2.438-.129h.774V9.664h-.774v6.991zm2.52.007c.07 0 .141-.002.211-.007.165-.012.308-.122.355-.281.082-.279.13-.574.143-.88H15.02V8.924c0-.28-.227-.507-.507-.507h-.265v8.239zm2.56-.008h.781V7.91h-.781v8.749zm1.705.008c.036 0 .073 0 .109-.001.242-.008.438-.204.446-.446a7.225 7.225 0 0 0-.007-.94h-.548v1.387zm1.611-.001a4.9 4.9 0 0 0 1.25-.164c.231-.059.395-.266.395-.504v-2.07h-1.645v2.738zm2.427-.164a4.908 4.908 0 0 0 2.247-2.183c.123-.231-.044-.509-.306-.509h-1.941v2.692z"/>
      </svg>
    )
  },
  {
    name: 'Vimeo',
    glowColor: 'rgba(26, 183, 234, 0.2)',
    hoverBg: 'hover:bg-[#1AB7EA]',
    hoverBorder: 'hover:border-[#1AB7EA]',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M23.977 6.416c-.105 2.338-1.738 5.54-4.894 9.609-3.268 4.247-6.036 6.371-8.307 6.371-1.403 0-2.584-1.29-3.537-3.871l-1.916-7.05c-.702-2.585-1.455-3.877-2.261-3.877-.175 0-.782.365-1.815 1.099L0 7.31c1.157-1.018 2.296-2.036 3.418-3.048 1.56-1.403 2.717-2.146 3.47-2.227 1.77-.193 2.86.994 3.269 3.568l1.455 5.626c.456 2.526.965 3.79 1.526 3.79.422 0 1.054-.65 1.896-1.948.841-1.3 1.299-2.28 1.37-2.948.14-1.422-.421-2.133-1.685-2.133-.579 0-1.229.132-1.948.396 1.176-3.844 3.419-5.748 6.729-5.713 2.44.026 3.593 1.633 3.456 4.82z"/>
      </svg>
    )
  },
  {
    name: 'Twitch',
    glowColor: 'rgba(145, 70, 255, 0.2)',
    hoverBg: 'hover:bg-[#9146FF]',
    hoverBorder: 'hover:border-[#9146FF]',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
      </svg>
    )
  }
];

function SitePill({ site }) {
  const Icon = site.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
        bg-white/40 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]
        text-slate-600 dark:text-gray-300
        transition-all duration-300 cursor-default hover:scale-105 hover:text-white
        ${hovered ? `${site.hoverBg} ${site.hoverBorder}` : ''}
      `}
      style={hovered ? {
        boxShadow: `0 0 20px ${site.glowColor}`,
      } : {}}
    >
      <Icon />
      <span>{site.name}</span>
    </div>
  );
}

export default function Home() {
  const [url, setUrl]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // slight delay so CSS transitions fire after first paint
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
    <main className="min-h-screen flex flex-col justify-between px-4 relative overflow-hidden transition-colors duration-300">

      {/* ── Animated gradient background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-slate-100 to-purple-50 dark:from-[#0a0514] dark:via-gray-950 dark:to-[#0d0a1f] -z-10" />

      {/* ── Floating orbs ── */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── Noise / grain overlay ── */}
      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.06] -z-10 pointer-events-none"
           style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Spacer to balance vertical centering */}
      <div className="h-6 shrink-0 md:h-12" />

      {/* ── Main card ── */}
      <div className="flex-1 flex flex-col items-center justify-center w-full py-8 z-10">
        <div className={`w-full max-w-lg space-y-8 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Logo Icon */}
          <div className={`flex justify-center transition-all duration-500 delay-[25ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative group cursor-pointer">
              {/* Glow backdrop */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
              <svg className="w-16 h-16 relative transform group-hover:scale-105 transition-transform duration-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad-home" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <rect width="100" height="100" rx="28" fill="url(#logo-grad-home)" />
                <path d="M 50 64 L 32 36 L 68 36 Z" fill="white" />
                <rect x="32" y="70" width="36" height="6" rx="3" fill="white" />
              </svg>
            </div>
          </div>

          {/* Badge */}
          <div className={`flex justify-center transition-all duration-500 delay-[50ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 animate-badge-pulse">
              <Sparkles className="w-3 h-3" />
              Free · No account needed
            </span>
          </div>

          {/* Heading */}
          <div className={`text-center space-y-3 transition-all duration-600 delay-[100ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-300 dark:to-purple-300 bg-clip-text text-transparent leading-tight">
              mediadwn
            </h1>
            <p className="text-base text-slate-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
              Paste any video or playlist link — pick your format and download instantly.
            </p>
          </div>

          {/* Input card */}
          <div className={`transition-all duration-600 delay-[200ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className={`relative backdrop-blur-2xl bg-white/70 dark:bg-white/[0.04] rounded-2xl border shadow-2xl transition-all duration-300 p-6 space-y-4
              ${focused
                ? 'border-indigo-400 dark:border-indigo-500 shadow-indigo-500/20 dark:shadow-indigo-500/30'
                : 'border-slate-200 dark:border-white/10 shadow-slate-200/50 dark:shadow-black/40'}`}>

              {/* Shimmer line at top when focused */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent rounded-full transition-all duration-500 ${focused ? 'w-3/4 opacity-100' : 'w-0 opacity-0'}`} />

              {/* URL input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className={`w-5 h-5 transition-colors duration-200 ${focused ? 'text-indigo-500' : 'text-slate-400 dark:text-gray-500'}`} />
                </div>
                <input
                  id="url-input"
                  type="text"
                  placeholder="Paste video or playlist URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full pl-12 pr-4 py-4 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-2.5 animate-shake">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Analyze button */}
              <button
                id="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || !url.trim()}
                className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group cursor-pointer active:scale-[0.98]"
              >
                {/* Gradient base */}
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-300" />
                {/* Hover shimmer layer */}
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Shimmer sweep */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                {/* Content */}
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing…</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Feature pills */}
          <div className={`grid grid-cols-2 gap-3 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {features.map(({ icon: Icon, label, sub }, i) => (
              <div
                key={label}
                className="feature-card group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.07] transition-all duration-250 cursor-default"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-white">{label}</div>
                  <div className="text-xs text-slate-500 dark:text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Supported Platforms Section ── */}
      <div className={`w-full max-w-5xl mx-auto py-6 space-y-4 z-10 transition-all duration-700 delay-[500ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center">
          <span className="text-[10px] tracking-[0.2em] font-bold text-slate-400 dark:text-gray-500 uppercase">
            Supported Platforms
          </span>
        </div>
        <div className="relative w-full overflow-hidden">
          {/* Left/Right mask gradients */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-indigo-50/90 to-transparent dark:from-[#0a0514]/90 pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-indigo-50/90 to-transparent dark:from-[#0a0514]/90 pointer-events-none z-10" />

          <div className="flex gap-4 animate-marquee py-2">
            {[...supportedSites, ...supportedSites, ...supportedSites].map((site, i) => (
              <SitePill key={`${site.name}-${i}`} site={site} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className={`w-full max-w-6xl mx-auto border-t border-slate-200/60 dark:border-white/[0.05] py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 dark:text-gray-500 shrink-0 z-10 transition-all duration-700 delay-[600ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-gray-300 text-xs">mediadwn</span>
          <span>&copy; {new Date().getFullYear()} · Fast &amp; Anonymous</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200">Terms</a>
          <a href="#" className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200">Privacy</a>
          <a href="#" className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200">API Docs</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200">GitHub</a>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>All systems operational</span>
        </div>
      </footer>
    </main>
  );
}
