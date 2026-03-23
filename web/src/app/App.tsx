import { HashRouter, Routes, Route } from 'react-router-dom';
import MainPage from '../pages/MainPage';
import ExportPage from '../pages/ExportPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/export/:jobId" element={<ExportPage />} />
      </Routes>
    </HashRouter>
  );
}
