import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (t) => {
    switch (t) {
      case 'light':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'dark':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'system':
      default:
        return <Monitor className="w-5 h-5 text-slate-500 dark:text-slate-400" />;
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50" ref={dropdownRef}>
      {/* Active button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-3 rounded-full shadow-lg border backdrop-blur-md bg-white/80 border-slate-200 hover:bg-slate-100 dark:bg-gray-900/80 dark:border-gray-800 dark:hover:bg-gray-800 transition-all duration-300 group cursor-pointer"
        aria-label="Toggle theme menu"
      >
        <span className="group-hover:rotate-12 transition-transform duration-300">
          {getThemeIcon(theme)}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 p-1.5 w-36 rounded-2xl shadow-xl border backdrop-blur-md bg-white/95 border-slate-200 dark:bg-gray-950/95 dark:border-gray-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1">
            {[
              { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4 text-amber-500" /> },
              { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4 text-indigo-400" /> },
              { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" /> },
            ].map((opt) => {
              const isActive = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 w-full text-left text-sm font-medium rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-gray-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  <span className="flex-shrink-0">{opt.icon}</span>
                  <span className="flex-grow">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
