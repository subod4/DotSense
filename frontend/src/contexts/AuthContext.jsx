// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../components/api/api.js';
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('braille_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        api.getUser(userData.user_id)
          .then(setUser)
          .catch(() => localStorage.removeItem('braille_user'))
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('braille_user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (name) => {
    const response = await api.login(name);
    const fullUser = await api.getUser(response.user_id);
    setUser(fullUser);
    localStorage.setItem('braille_user', JSON.stringify(fullUser));
  };

  const register = async (name, age) => {
    const newUser = await api.register(name, age);
    setUser(newUser);
    localStorage.setItem('braille_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('braille_user');
  };

  const updateUser = async (updates) => {
    if (!user) return;
    const updatedUser = await api.updateUser(user.user_id, updates);
    setUser(updatedUser);
    localStorage.setItem('braille_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
