import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export default function BatchProgress() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobIds = (searchParams.get('job_ids') || '').split(',').filter(Boolean);
  const format = searchParams.get('format');

  const [jobs, setJobs] = useState(
    jobIds.map((id) => ({ id, status: 'pending', progress: 0, error: null }))
  );

  useEffect(() => {
    if (jobIds.length === 0) {
      navigate('/');
      return;
    }

    const interval = setInterval(async () => {
      const updatedJobs = [...jobs];
      let allDone = true;

      for (let i = 0; i < jobIds.length; i++) {
        const job = updatedJobs[i];
        if (job.status === 'done' || job.status === 'failed') continue;
        allDone = false;
        try {
          const res = await fetch(
            `http://localhost:4000/status/${job.id}`
          );
          if (!res.ok) throw new Error('Job not found');
          const data = await res.json();
          job.status = data.status;
          job.progress = data.progress;
          job.error = data.error || null;
        } catch (e) {
          job.status = 'failed';
          job.error = e.message;
        }
      }

      setJobs([...updatedJobs]);

      if (allDone) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobIds, navigate]);

  const statusIcon = (status) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />;
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const overallProgress = () => {
    const total = jobs.length;
    if (total === 0) return 0;
    const completed = jobs.filter(
      (j) => j.status === 'done' || j.status === 'failed'
    ).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 to-indigo-950 -z-10" />
      <div className="w-full max-w-lg space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
          <h2 className="text-2xl font-bold text-center">
            Downloading {jobs.length} item{jobs.length > 1 ? 's' : ''}
          </h2>

          {/* Overall progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${overallProgress()}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              {overallProgress()}% complete
            </p>
          </div>

          {/* Individual job list */}
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {jobs.map((job, idx) => (
              <div
                key={job.id}
                className={`p-3 rounded-xl border ${
                  job.status === 'failed'
                    ? 'border-red-400/30 bg-red-400/5'
                    : job.status === 'done'
                    ? 'border-green-400/30 bg-green-400/5'
                    : 'border-white/10 bg-white/5'
                } flex items-center gap-3`}
              >
                {statusIcon(job.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.id.slice(0, 8)}... ({job.status})
                  </p>
                  {job.status === 'processing' && (
                    <div className="mt-1 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                  {job.error && (
                    <p className="text-xs text-red-400 mt-1 truncate">{job.error}</p>
                  )}
                </div>
                {job.status === 'done' && (
                  <a
                    href={`http://localhost:4000/file/${job.id}`}
                    download
                    className="flex-shrink-0 p-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 transition-colors"
                  >
                    <Download className="w-4 h-4 text-green-400" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {jobs.every((j) => j.status === 'done' || j.status === 'failed') && (
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            >
              Start Over
            </button>
          )}
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
          background: rgba(99, 102, 241, 0.5);
          border-radius: 2px;
        }
      `}</style>
    </main>
  );
}