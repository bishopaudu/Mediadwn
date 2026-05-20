import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

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

  const getStatusText = () => {
    if (status === 'done') return 'Completed';
    if (status === 'failed') return 'Failed';
    if (status === 'processing') return 'Processing…';
    return 'Waiting…';
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="text-2xl font-bold">{getStatusText()}</h2>

        {status !== 'done' && (
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {status === 'done' && (
          <a
            href={`http://localhost:4000/file/${job_id}`}
            className="inline-block py-3 px-8 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-white"
            download
          >
            Download {format?.toUpperCase()} File
          </a>
        )}

        {status === 'failed' && (
          <div className="text-red-400">
            <p>Something went wrong.</p>
            {error && <p className="text-sm mt-1">{error}</p>}
          </div>
        )}

        <button onClick={() => navigate('/')} className="text-indigo-400 hover:underline">
          Start Over
        </button>
      </div>
    </main>
  );
}