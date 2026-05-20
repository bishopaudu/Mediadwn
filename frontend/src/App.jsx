import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Preview from './pages/Preview';
import Progress from './pages/Progress';

function App() {
  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/progress" element={<Progress />} />
      </Routes>
    </div>
  );
}

export default App;