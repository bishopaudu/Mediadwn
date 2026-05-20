import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Download, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function Progress() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const job_id = searchParams.get('job_id');
  const title = searchParams.get('title');
  const format = searchParams.get('format');

  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!job_id) {
      navigate('/');
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:4000/status/${job_id}`);
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

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return { icon: Loader2, color: 'text-gray-400', bg: 'bg-gray-800', label: 'Preparing...' };
      case 'processing':
        return { icon: Loader2, color: 'text-indigo-400', bg: 'bg-indigo-900/30', label: 'Downloading & converting...' };
      case 'done':
        return { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/30', label: 'Completed' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', label: 'Failed' };
      default:
        return { icon: Loader2, color: 'text-gray-400', bg: 'bg-gray-800', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 to-indigo-950 -z-10" />
      <div className="w-full max-w-md space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          {/* Status icon */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
            <StatusIcon className={`w-8 h-8 ${status === 'pending' || status === 'processing' ? 'animate-spin' : ''}`} />
          </div>

          <h2 className="text-2xl font-bold">{statusConfig.label}</h2>

          {title && <p className="text-gray-400 text-sm truncate">{decodeURIComponent(title)}</p>}

          {/* Progress bar for non-done states */}
          {status !== 'done' && status !== 'failed' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{progress}%</p>
            </div>
          )}

          {/* Success state */}
          {status === 'done' && (
            <a
              href={`http://localhost:4000/file/${job_id}`}
              className="inline-flex items-center gap-2 py-4 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-green-600/25 transition-all"
              download
            >
              <Download className="w-5 h-5" />
              Download {format?.toUpperCase()}
            </a>
          )}

          {/* Failure state */}
          {status === 'failed' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-sm text-red-300">
                {error || 'Something went wrong during processing.'}
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
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

