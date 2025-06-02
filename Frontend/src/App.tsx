import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch } from './store/hooks';
import { fetchCurrentUser } from './store/slices/authSlice';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ScrapeResultPage from './pages/ScrapeResultPage';
import OAuthCallback from './pages/OAuthCallback';
import ExtractionDetailPage from './pages/ExtractionDetailPage';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/result/:url" element={
          <ProtectedRoute>
            <ScrapeResultPage />
          </ProtectedRoute>
        } />
        <Route path="/extraction/:id" element={
          <ProtectedRoute>
            <ExtractionDetailPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
