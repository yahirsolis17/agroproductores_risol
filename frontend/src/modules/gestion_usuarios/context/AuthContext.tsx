// src/modules/gestion_usuarios/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { User } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import apiClient from '../../../global/api/apiClient';

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  login: (telefono: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}


const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getUser());

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        await refreshSession();
      } catch {
        authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (authService.getAccessToken()) {
      init();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshSession = async () => {
    const me = await authService.getMe();
    setUser(me);
    localStorage.setItem('user', JSON.stringify(me));
  };

  const login = async (telefono: string, password: string) => {
    const { user: loggedIn, must_change_password, notification } = await authService.login({
      telefono,
      password,
    });
  
    handleBackendNotification({ success: true, notification });
  
    const userWithFlag = { ...loggedIn, must_change_password };
    setUser(userWithFlag);
    localStorage.setItem('user', JSON.stringify(userWithFlag));
  
    navigate(must_change_password ? '/change-password' : '/dashboard', {
      replace: true,
    });
  };
  

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await apiClient.post('/usuarios/logout/', {
        refresh_token: refreshToken
      });
  
      handleBackendNotification(response.data); // 🔥 NOTIFICACIÓN CENTRALIZADA
    } catch (error: any) {
      handleBackendNotification(error.response?.data || {
        success: false,
        notification: {
          key: 'logout_error',
          message: 'No se pudo cerrar sesión correctamente',
          type: 'error',
        }
      });
    } finally {
      authService.logout();
      setUser(null);
      navigate('/login');
    }
  };
  

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isUser: user?.role === 'usuario',
        loading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
