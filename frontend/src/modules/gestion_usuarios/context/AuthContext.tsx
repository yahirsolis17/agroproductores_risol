// src/modules/gestion_usuarios/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { User } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  login: (telefono: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Corregido: Usar getRefreshToken en lugar de refreshToken
          await authService.getRefreshToken();
          await refreshSession();
        }
      } catch (error) {
        handleAuthError(error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleAuthError = (error: any) => {
    if (error.response?.notification) {
      handleBackendNotification(error.response.notification);
      
      if (error.response.status === 401) {
        authService.logout();
        setUser(null);
      }
    } else {
      handleBackendNotification({
        key: 'connection_error',
        type: 'error',
        message: 'Error de conexión con el servidor'
      });
    }
  };

  const refreshSession = async () => {
    try {
      const userData = await authService.getMe();
      const updatedUser = { 
        ...userData, 
        must_change_password: userData.must_change_password 
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      handleAuthError(error);
    }
  };

  const login = async (telefono: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login({ telefono, password });

      // Acceso correcto a la estructura de la respuesta
      if (response.notification) {
        handleBackendNotification(response.notification);
      }

      const userData = {
        ...response.user,
        must_change_password: response.must_change_password
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      localStorage.setItem('access_token', response.tokens.access);
      localStorage.setItem('refresh_token', response.tokens.refresh);

      // Implementar redirección
      if (response.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

    } catch (error) {
      handleAuthError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      handleBackendNotification({
        key: 'logout_success',
        type: 'info',
        message: 'Sesión cerrada correctamente',
        action: 'redirect',
        target: '/login'
      });
      navigate('/login');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};