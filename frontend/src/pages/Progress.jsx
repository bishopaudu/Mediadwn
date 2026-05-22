import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Download, CheckCircle2, XCircle, Loader2, ArrowLeft, Share2, Copy, Check } from 'lucide-react';
import { getUserId } from '../helper/userID';
import API_BASE from '../config';

export default function Progress() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const job_id = searchParams.get('job_id');
  const title = searchParams.get('title');
  const format = searchParams.get('format');

  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!job_id) {
      navigate('/');
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${job_id}`);
        if (!res.ok) throw new Error('Job not found');
        const data = await res.json();
        setStatus(data.status);
        setProgress(data.progress);
        if (data.error) setError(data.error);
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (e) {
        setError(e.message);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [job_id, navigate]);

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const userId = getUserId();
      const res = await fetch(`${API_BASE}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          job_id: job_id,
          expires_in_hours: 24,
        }),
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

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return { icon: Loader2, color: 'text-slate-500 dark:text-gray-400', bg: 'bg-slate-200 dark:bg-gray-800', label: 'Preparing...' };
      case 'processing':
        return { icon: Loader2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', label: 'Downloading & converting...' };
      case 'done':
        return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', label: 'Completed' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', label: 'Failed' };
      default:
        return { icon: Loader2, color: 'text-slate-500 dark:text-gray-400', bg: 'bg-slate-200 dark:bg-gray-800', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 -z-10" />
      <div className="w-full max-w-md space-y-8">

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-6">

          {/* Status icon */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className={`w-8 h-8 ${status === 'pending' || status === 'processing' ? 'animate-spin' : ''}`} />
          </div>

          {/* Status label */}
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{statusConfig.label}</h2>

          {/* Video title */}
          {title && (
            <p className="text-slate-500 dark:text-gray-400 text-sm truncate">
              {decodeURIComponent(title)}
            </p>
          )}

          {/* Progress bar */}
          {(status === 'pending' || status === 'processing') && (
            <div className="space-y-2">
              <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-500">{progress}%</p>
            </div>
          )}

          {/* ── Success state ── */}
          {status === 'done' && (
            <div className="space-y-4">

              {/* Download button */}
               <a href={`${API_BASE}/file/${job_id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-green-600/15 dark:shadow-green-600/25 transition-all cursor-pointer"
                download
              >
                <Download className="w-5 h-5" />
                Download {format?.toUpperCase()}
              </a>

              {/* Share section */}
              {!showShare ? (
                <button
                  onClick={handleShare}
                  disabled={shareLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  {shareLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Generate Share Link
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2 text-left">
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Shareable link <span className="text-slate-400 dark:text-gray-600">(expires in 24h)</span>
                  </p>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800/80 border border-slate-200 dark:border-white/10 p-3 rounded-xl">
                    <input
                      readOnly
                      value={shareLink}
                      className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm outline-none truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Failure state ── */}
          {status === 'failed' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-100/50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/20 rounded-xl text-sm text-red-600 dark:text-red-300 text-left">
                {error || 'Something went wrong during processing.'}
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-colors text-slate-800 dark:text-white cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

