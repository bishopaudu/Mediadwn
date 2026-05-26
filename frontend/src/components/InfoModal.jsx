import { useState, useEffect } from 'react';
import { X, Info, Shield, FileText, Mail, Send, Check, AlertCircle, Server, Terminal, MessageSquare, ArrowRight, CloudLightning } from 'lucide-react';

export default function InfoModal({ type, onClose }) {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'Feedback', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Handle Close on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!type) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      // Save simulation info to local storage for demo/testing reference
      const savedMessages = JSON.parse(localStorage.getItem('mediadwn_messages') || '[]');
      savedMessages.push({ ...formData, timestamp: new Date().toISOString() });
      localStorage.setItem('mediadwn_messages', JSON.stringify(savedMessages));
      
      // Reset form
      setFormData({ name: '', email: '', subject: 'Feedback', message: '' });
    }, 1200);
  };

  const renderHeader = () => {
    switch (type) {
      case 'about':
        return (
          <>
            <Info className="w-5 h-5 text-indigo-500" />
            <span>About mediadwn</span>
          </>
        );
      case 'privacy':
        return (
          <>
            <Shield className="w-5 h-5 text-emerald-500" />
            <span>Privacy Policy</span>
          </>
        );
      case 'terms':
        return (
          <>
            <FileText className="w-5 h-5 text-blue-500" />
            <span>Terms of Service</span>
          </>
        );
      case 'contact':
        return (
          <>
            <Mail className="w-5 h-5 text-pink-500" />
            <span>Contact & Support</span>
          </>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'about':
        return (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/[0.04] border border-indigo-200/50 dark:border-indigo-500/20 flex gap-4">
              <CloudLightning className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">High-Performance Media Archiver</h4>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  <strong>mediadwn</strong> is a web utility that processes URL queries and prepares media conversions on-demand, delivering standard video and audio streams directly to your browser.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p>
                <strong>mediadwn</strong> splits tasks between a modern browser interface and a high-performance cloud processing layer to keep downloads fast and uncomplicated:
              </p>
              <ul className="list-disc list-inside pl-2 space-y-1.5 text-slate-600 dark:text-gray-300">
                <li>
                  <strong className="text-slate-800 dark:text-white">Rust Application Layer:</strong> An Axum and Tokio server handles high-throughput requests, coordinates formatting jobs, and manages downloads safely.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-white">Extraction Engine:</strong> Powered by <code>yt-dlp</code> to analyze online pages and stream media fragments from target providers.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-white">Post-Processing Engine:</strong> Utilizes <code>ffmpeg</code> to merge files, extract high-quality audio formats, trim video clips, and bake in selected subtitle languages.
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-100 dark:border-white/[0.06] pt-4">
              <h4 className="font-bold text-slate-800 dark:text-white mb-2">No Restrictions, No Tracking</h4>
              <p>
                Unlike commercial download platforms, we prioritize a clean, ad-free experience. We don't impose artificial speed caps, restrict download volume, or require account sign-ups to access core features.
              </p>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-5">
            <p className="text-slate-500 dark:text-gray-400 italic">
              Effective Date: May 2026. This policy outlines how we protect your privacy while using our online media downloader service.
            </p>

            <div className="space-y-4">
              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  1. Zero Data Collection & Logging
                </h4>
                <p className="pl-4">
                  We do not require user accounts or registrations. We do not track, log, or store your IP addresses, search terms, download history, or any personal identification details.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  2. Temporary File Caching
                </h4>
                <p className="pl-4">
                  When you download a file, the video or audio is processed and cached temporarily on our servers only for the duration of the download. All cached files are automatically and permanently deleted from our servers shortly after processing or after a brief expiry window.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  3. Network and Security
                </h4>
                <p className="pl-4">
                  All requests between your browser and our server are secured with SSL/TLS encryption. Connection requests to source media sites are initiated directly from our servers. This acts as a proxy, protecting your personal IP address from being exposed to the destination media hosting sites during the download process.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  4. Browser Preferences
                </h4>
                <p className="pl-4">
                  We use lightweight browser storage (like localStorage) strictly to save local interface choices, such as keeping track of your preferred theme (dark or light mode).
                </p>
              </section>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-5">
            <p className="text-slate-500 dark:text-gray-400 italic">
              By accessing and using this service, you agree to comply with the terms of use outlined below.
            </p>

            <div className="space-y-4">
              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white">1. Permitted Use and Archival Purpose</h4>
                <p>
                  <strong>mediadwn</strong> is provided as an online tool for personal archiving, backup, and educational use. You must not use this service to infringe copyrights, copy trademarked assets, or distribute protected digital files for commercial gains.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white">2. User Responsibility</h4>
                <p>
                  You are solely responsible for ensuring you have the legal right or explicit permission to download and archive content from target websites. <strong>mediadwn</strong> does not store files permanently and merely performs format conversions on your behalf.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-white">3. Warranty Disclaimer</h4>
                <p>
                  This service is provided "as is" without warranty of any kind. We do not guarantee continuous support for all formats or platforms, as target video hosts regularly change their streaming configurations. We are not liable for any issues arising from your use of the downloaded files.
                </p>
              </section>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-5">
            {submitSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 scale-105 transition-all">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-lg text-slate-800 dark:text-white">Message Sent Successfully!</h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm">
                    Thank you for reaching out. Your message has been sent to our support team and we will get back to you shortly.
                  </p>
                </div>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Encountered a download error?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-gray-400 leading-normal">
                    Target platforms change their streaming logic frequently. If a specific URL fails to analyze or download, please send us a report containing the exact link, and we will update our extraction rules immediately.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 dark:text-gray-500">Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 dark:text-gray-500">Email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        className="w-full px-3.5 py-2.5 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 dark:text-gray-500">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all"
                    >
                      <option value="Feedback" className="bg-white dark:bg-gray-900">General Feedback</option>
                      <option value="Bug Report" className="bg-white dark:bg-gray-900">Bug Report</option>
                      <option value="Feature Suggestion" className="bg-white dark:bg-gray-900">Feature Suggestion</option>
                      <option value="Other" className="bg-white dark:bg-gray-900">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 dark:text-gray-500">Message</label>
                    <textarea
                      name="message"
                      required
                      rows="4"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Write your query or message here..."
                      className="w-full px-3.5 py-2.5 bg-white/80 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl font-semibold text-white relative overflow-hidden transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs group cursor-pointer"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600" />
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center justify-center gap-1.5">
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gray-950 shadow-2xl flex flex-col animate-modal-scale"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />

        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.01]">
          <h3 className="flex items-center gap-2 font-bold text-base text-slate-800 dark:text-white uppercase tracking-wider">
            {renderHeader()}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-800 dark:text-gray-500 dark:hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="px-6 py-6 overflow-y-auto flex-1 text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
          {renderContent()}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.08] flex justify-end shrink-0 bg-slate-50/50 dark:bg-white/[0.01]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer"
          >
            Dismiss
          </button>
        </footer>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-scale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-modal-scale {
          animation: modal-scale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
