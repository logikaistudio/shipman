import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  user: { id: string; email: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('shipman_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setIsLoggedIn(true);
      } catch (err) {
        console.error('Failed to parse saved auth:', err);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // For now, use mock authentication
      // In production, call backend /api/v1/auth/login
      if (email && password.length >= 6) {
        let name = 'Budi Operator';
        let role = 'Crew';
        let id = 'user-002';
        
        if (email.toLowerCase() === 'superadmin' || email.toLowerCase().startsWith('superadmin@')) {
          name = 'Super Admin';
          role = 'Admin';
          id = 'user-superadmin';
        } else if (email.toLowerCase().includes('chief')) {
          name = 'John Chief';
          role = 'ChiefEngineer';
          id = 'user-001';
        } else if (email.toLowerCase().includes('admin')) {
          name = 'Admin Manager';
          role = 'Admin';
          id = 'user-003';
        } else if (email.toLowerCase().includes('officer')) {
          name = 'Officer Comm';
          role = 'Officer';
          id = 'user-004';
        }

        const mockUser = {
          id: id,
          email: email,
          name: name,
          role: role
        };
        setUser(mockUser as any);
        setIsLoggedIn(true);
        // Store in localStorage
        localStorage.setItem('shipman_auth', JSON.stringify(mockUser));
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('shipman_auth');
    localStorage.removeItem('shipman_selected_vessel');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
