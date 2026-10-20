import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  sessionToken: string | null;
  demoUsers: User[];
  loading: boolean;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'draftspace_session_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load demo users and initialize session
  useEffect(() => {
    async function initAuth() {
      try {
        setLoading(true);
        // Fetch all available demo users
        const users = await api.getUsers();
        setDemoUsers(users);

        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          try {
            const me = await api.getMe();
            setCurrentUser(me.user);
            setSessionToken(storedToken);
            setLoading(false);
            return;
          } catch {
            // Token expired or invalid, fall through to default
            localStorage.removeItem(TOKEN_KEY);
          }
        }

        // Default to first demo user (Alex Rivera)
        if (users.length > 0) {
          const res = await api.loginAsUser(users[0].id);
          localStorage.setItem(TOKEN_KEY, res.token);
          setSessionToken(res.token);
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error('Failed to initialize authentication:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const switchUser = async (userId: string) => {
    try {
      setLoading(true);
      const res = await api.loginAsUser(userId);
      localStorage.setItem(TOKEN_KEY, res.token);
      setSessionToken(res.token);
      setCurrentUser(res.user);
    } catch (err) {
      console.error('Failed to switch user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setCurrentUser(me.user);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        sessionToken,
        demoUsers,
        loading,
        switchUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
