import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  demoUsers: User[];
  loading: boolean;
  switchUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = 'draftspace_session_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      try {
        setLoading(true);
        // Load demo users list
        const res = await api.getDemoUsers();
        setDemoUsers(res.users);

        // Try restoring existing session
        try {
          const me = await api.getMe();
          setCurrentUser(me.user);
          setLoading(false);
          return;
        } catch {
          // No active session or expired
          localStorage.removeItem(TOKEN_KEY);
        }

        // Default to first demo user (Alice Smith)
        if (res.users.length > 0) {
          const sessionRes = await api.createDemoSession(res.users[0].id);
          localStorage.setItem(TOKEN_KEY, sessionRes.sessionToken);
          setCurrentUser(sessionRes.user);
        }
      } catch (err) {
        console.error('Failed to initialize demo identity:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const switchUser = async (userId: string) => {
    try {
      setLoading(true);
      const res = await api.createDemoSession(userId);
      localStorage.setItem(TOKEN_KEY, res.sessionToken);
      setCurrentUser(res.user);
    } catch (err) {
      console.error('Failed to switch demo user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await api.deleteSession();
      localStorage.removeItem(TOKEN_KEY);
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
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
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        demoUsers,
        loading,
        switchUser,
        logout,
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
