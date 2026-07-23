import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { IAPProvider } from './hooks/useIAP';
import { setAuthFunctions } from './api/client';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewInterview from './pages/NewInterview';
import History from './pages/History';
import Settings from './pages/Settings';
import MicCheck from './pages/MicCheck';
import VoiceConsent from './pages/VoiceConsent';
import InterviewSession from './pages/InterviewSession';
import FeedbackReport from './pages/FeedbackReport';
import SignIn from './pages/SignIn';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment');
}

/**
 * Bridges Clerk's React auth hooks to the imperative API client singleton.
 */
function ClerkAuthBridge() {
  const { getToken, signOut } = useAuth();

  useEffect(() => {
    setAuthFunctions(getToken, signOut);
  }, [getToken, signOut]);

  return null;
}

function NavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI.onNavigate((route) => {
      navigate(route);
    });
  }, [navigate]);

  return null;
}

function AuthenticatedApp() {
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
          <Route path="/interview/feedback" element={<FeedbackReport />} />
        </Routes>
      </IAPProvider>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkAuthBridge />
        <HashRouter>
          <SignedOut>
            <SignIn />
          </SignedOut>
          <SignedIn>
            <AuthenticatedApp />
          </SignedIn>
        </HashRouter>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
