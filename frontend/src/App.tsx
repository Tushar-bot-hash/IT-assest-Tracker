import React, { useState, useEffect, createContext, useContext } from 'react';
import api from './api/axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'IT_Admin' | 'HR_Manager' | 'Standard_Employee';
  department: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Initialize Dark Mode by default
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/api/auth/me/');
        setUser(response.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setError(null);
    try {
      const response = await api.post('/api/auth/login/', { username, password });
      setUser(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/');
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-indigo-500 border-slate-700"></div>
          <p className="text-sm font-medium tracking-wide text-slate-400">Loading Secure Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, error, setError }}>
      <div className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        {user ? (
          <Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />
        ) : (
          <Login />
        )}
      </div>
    </AuthContext.Provider>
  );
}
export { AuthContext };
