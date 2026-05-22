import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Preview from './pages/Preview';
import Progress from './pages/Progress';
import BatchProgress from './pages/BatchProgress';
import Library from './pages/Library';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';

function App() {
  const { resolvedTheme } = useTheme();

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white transition-colors duration-300 ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/batch-progress" element={<BatchProgress />} /> 
        <Route path="/library" element={<Library />} />
      </Routes>
    </div>
  );
}

export default App;