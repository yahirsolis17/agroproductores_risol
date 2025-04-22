// src/modules/gestion_usuarios/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import authService, { User } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import apiClient from '../../../global/api/apiClient';

/* --------- API de contexto --------- */
interface AuthContextProps {
  /* estado */
  user: User | null;
  permissions: string[];
  loading: boolean;

  /* derivados */
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  hasPerm: (perm: string) => boolean;

  /* acciones */
  login: (telefono: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

/* ---------- Provider ---------- */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* helper para UI */
  const hasPerm = (perm: string) => permissions.includes(perm);

  /* ---------- montar ---------- */
  useEffect(() => {
    const init = async () => {
      try {
        await refreshSession();
      } catch {
        authService.logout();
        setUser(null);
        setPermissions([]);
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

  /* ---------- helpers internos ---------- */
  const fetchPermissions = async () => {
    try {
      const res = await apiClient.get('/usuarios/me/permissions/');
      setPermissions(res.data.permissions ?? []);
      localStorage.setItem(
        'permissions',
        JSON.stringify(res.data.permissions ?? []),
      );
    } catch {
      setPermissions([]);
    }
  };

  /* ---------- acciones ---------- */
  const refreshSession = async () => {
    const me = await authService.getMe();
    setUser(me);
    localStorage.setItem('user', JSON.stringify(me));
    await fetchPermissions();
  };

  const login = async (telefono: string, password: string) => {
    const {
      user: loggedIn,
      must_change_password,
      notification,
      tokens,
    } = await authService.login({ telefono, password });

    handleBackendNotification({ success: true, notification });

    /* guardar tokens y usuario */
    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    const userWithFlag = { ...loggedIn, must_change_password };
    setUser(userWithFlag);
    localStorage.setItem('user', JSON.stringify(userWithFlag));

    /* permisos */
    await fetchPermissions();

    navigate(
      must_change_password ? '/change-password' : '/dashboard',
      { replace: true },
    );
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await apiClient.post('/usuarios/logout/', { refresh_token: refreshToken });
      handleBackendNotification({
        success: true,
        notification: {
          key: 'logout_success',
          message: 'Sesión cerrada correctamente',
          type: 'info',
        },
      });
    } catch {
      /* ignoramos fallo de logout */
    } finally {
      authService.logout();
      setUser(null);
      setPermissions([]);
      navigate('/login');
    }
  };

  /* ---------- expose ---------- */
  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isUser: user?.role === 'usuario',
        hasPerm,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ---------- Hook ---------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
