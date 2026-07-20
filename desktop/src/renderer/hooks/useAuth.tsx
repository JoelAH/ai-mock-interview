import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  userId: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  getToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial auth state from main process
    window.electronAPI.getAuthState().then((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUserId(state.userId);
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    window.electronAPI.onAuthStateChanged((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUserId(state.userId);
      setIsLoading(false);
    });
  }, []);

  const signIn = async () => {
    await window.electronAPI.signIn();
  };

  const signOut = async () => {
    await window.electronAPI.signOut();
  };

  const getToken = async () => {
    return window.electronAPI.getToken();
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userId, isLoading, signIn, signOut, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
