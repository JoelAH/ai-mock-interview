import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { IAPProvider } from './hooks/useIAP';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewInterview from './pages/NewInterview';
import History from './pages/History';
import Settings from './pages/Settings';
import MicCheck from './pages/MicCheck';
import VoiceConsent from './pages/VoiceConsent';
import InterviewSession from './pages/InterviewSession';
import SignIn from './pages/SignIn';

function NavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI.onNavigate((route) => {
      navigate(route);
    });
  }, [navigate]);

  return null;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <>
      <NavigationListener />
      <IAPProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-interview" element={<NewInterview />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/interview/mic-check" element={<MicCheck />} />
          <Route path="/interview/consent" element={<VoiceConsent />} />
          <Route path="/interview/session" element={<InterviewSession />} />
        </Routes>
      </IAPProvider>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
