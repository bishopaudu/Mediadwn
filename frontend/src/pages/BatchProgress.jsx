import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API_BASE from '../config';
import {
  Download, CheckCircle2, XCircle, Loader2, ArrowLeft, ListVideo,
} from 'lucide-react';

export default function BatchProgress() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobIds = (searchParams.get('job_ids') || '').split(',').filter(Boolean);
  const format = searchParams.get('format');

  const [jobs, setJobs]       = useState(jobIds.map((id) => ({ id, status: 'pending', progress: 0, error: null })));
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (jobIds.length === 0) { navigate('/'); return; }

    const timer = setInterval(() => setElapsed(e => e + 1), 1000);

    const interval = setInterval(async () => {
      const updatedJobs = [...jobs];
      let allDone = true;

      for (let i = 0; i < jobIds.length; i++) {
        const job = updatedJobs[i];
        if (job.status === 'done' || job.status === 'failed') continue;
        allDone = false;
        try {
          const res  = await fetch(`${API_BASE}/status/${job.id}`);
          if (!res.ok) throw new Error('Job not found');
          const data = await res.json();
          job.status   = data.status;
          job.progress = data.progress;
          job.error    = data.error || null;
        } catch (e) {
          job.status = 'failed';
          job.error  = e.message;
        }
      }

      setJobs([...updatedJobs]);
      if (allDone) { clearInterval(interval); clearInterval(timer); }
    }, 1000);

    return () => { clearInterval(interval); clearInterval(timer); };
  }, [jobIds, navigate]);

  const overallProgress = () => {
    if (jobs.length === 0) return 0;
    const completed = jobs.filter((j) => j.status === 'done' || j.status === 'failed').length;
    return Math.round((completed / jobs.length) * 100);
  };

  const allFinished = jobs.every((j) => j.status === 'done' || j.status === 'failed');
  const doneCount   = jobs.filter((j) => j.status === 'done').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  const statusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-[#B0ADA8] dark:text-[#444]" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" />;
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" style={{ animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }} />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] dark:bg-[#0F0F0E] text-[#1A1A1A] dark:text-[#E8E8E6]">

      {/* ── Grid background ── */}
      <div
        className="fixed inset-0 opacity-[0.022] dark:opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* ── Floating orbs ── */}
      <div className="fixed top-[-80px] right-[-60px] w-[360px] h-[360px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)', filter: 'blur(70px)', animation: 'float-orb 14s ease-in-out infinite' }} />
      <div className="fixed bottom-[-60px] left-[-50px] w-[280px] h-[280px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', filter: 'blur(70px)', animation: 'float-orb 18s ease-in-out infinite reverse', animationDelay: '-5s' }} />

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

      {/* ── Card ── */}
      <div
        className="relative z-10 max-w-lg mx-auto px-8 pb-20 space-y-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.55s ease 0.1s, transform 0.55s ease 0.1s',
        }}
      >

        {/* Header card */}
        <div className="rounded-2xl border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm overflow-hidden">

          {/* Title row */}
          <div className="px-6 py-5 border-b border-[#F0EDE8] dark:border-[#2A2A28] flex items-center gap-3">
            <span className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <ListVideo className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-lg text-[#1A1A1A] dark:text-[#E8E8E6] leading-tight">
                Batch Download
              </h2>
              <p className="text-xs text-[#6B6B6B] dark:text-[#888] mt-0.5">
                {jobs.length} item{jobs.length > 1 ? 's' : ''} · {formatElapsed(elapsed)} elapsed
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6B6B6B] dark:text-[#888]">
              <span>Overall progress</span>
              <span className="tabular-nums font-semibold text-[#1A1A1A] dark:text-[#E8E8E6]">{overallProgress()}%</span>
            </div>
            <div className="w-full h-2 bg-[#F0EDE8] dark:bg-[#2A2A28] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{
                  width: `${overallProgress()}%`,
                  background: allFinished
                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : 'linear-gradient(90deg, #2563EB, #4F46E5)',
                }}
              >
                {!allFinished && (
                  <span className="absolute inset-0 animate-bar-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {doneCount} done
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                  <XCircle className="w-3.5 h-3.5" />
                  {failedCount} failed
                </span>
              )}
              <span className="text-[#B0ADA8] dark:text-[#444] ml-auto">
                {jobs.length - doneCount - failedCount} remaining
              </span>
            </div>
          </div>
        </div>

        {/* ── Job list ── */}
        <div className="rounded-2xl border border-[#E0DDD8] dark:border-[#2A2A28] bg-white dark:bg-[#1A1A18] shadow-sm overflow-hidden">
          <div className="px-6 py-3.5 border-b border-[#F0EDE8] dark:border-[#2A2A28]">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] dark:text-[#888]">
              Items
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {jobs.map((job, idx) => (
              <div
                key={job.id}
                className={`px-6 py-4 flex items-center gap-3 border-b border-[#F5F4F0] dark:border-[#1E1E1C] last:border-0 transition-colors duration-300 ${
                  job.status === 'done'
                    ? 'bg-green-50/40 dark:bg-green-500/[0.04]'
                    : job.status === 'failed'
                    ? 'bg-red-50/40 dark:bg-red-500/[0.04]'
                    : ''
                }`}
                style={{ animation: `batchItemIn 0.4s ease ${idx * 60}ms both` }}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-5">{statusIcon(job.status)}</div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#E8E8E6] truncate">
                      Item {idx + 1}
                      <span className="ml-2 text-xs font-normal text-[#B0ADA8] dark:text-[#444]">
                        {job.id.slice(0, 8)}…
                      </span>
                    </p>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      job.status === 'done'    ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' :
                      job.status === 'failed'  ? 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400' :
                      job.status === 'processing' ? 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400' :
                      'bg-[#F0EDE8] dark:bg-[#2A2A28] text-[#6B6B6B] dark:text-[#888]'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  {/* Per-job bar */}
                  {(job.status === 'processing' || job.status === 'pending') && (
                    <div className="w-full h-1 bg-[#F0EDE8] dark:bg-[#2A2A28] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                        style={{
                          width: `${job.progress}%`,
                          background: job.status === 'processing'
                            ? 'linear-gradient(90deg, #2563EB, #4F46E5)'
                            : '#C8C4BE',
                        }}
                      >
                        {job.status === 'processing' && (
                          <span className="absolute inset-0 animate-bar-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        )}
                      </div>
                    </div>
                  )}

                  {job.error && (
                    <p className="text-xs text-red-500 dark:text-red-400 truncate">{job.error}</p>
                  )}
                </div>

                {/* Download link */}
                {job.status === 'done' && (
                  <a
                    href={`${API_BASE}/file/${job.id}`}
                    download
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-500/15 dark:hover:bg-green-500/25 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium transition-colors duration-200 cursor-pointer"
                    style={{ animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {format?.toUpperCase()}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── All done CTA ── */}
        {allFinished && (
          <div style={{ animation: 'fadeSlideIn 0.4s ease both' }}>
            <button
              onClick={() => navigate('/')}
              className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden group transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <span className="relative">Start Over</span>
            </button>
          </div>
        )}

      </div>

      <style>{`

        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes batchItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
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