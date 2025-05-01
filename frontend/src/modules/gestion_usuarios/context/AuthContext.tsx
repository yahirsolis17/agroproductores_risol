import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../global/store/store';

import authService, { User } from '../services/authService';
import apiClient from '../../../global/api/apiClient';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

/* --------- API del contexto --------- */
interface AuthContextProps {
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

/* ------------------------------------------------------------------------ */
/*                         PROVIDER                                         */
/* ------------------------------------------------------------------------ */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();

  /* --- localStorage para sesión persistente --- */
  const storedUser  = authService.getUser();
  const storedPerms = JSON.parse(localStorage.getItem('permissions') || '[]');

  /* --- estado local del contexto --- */
  const [user, setUser]               = useState<User | null>(storedUser);
  const [permissions, setPermissions] = useState<string[]>(storedPerms);
  const [loading, setLoading]         = useState(true);

  /* --- 🔄  Sincronizar con Redux en tiempo real --- */
  const reduxPerms = useSelector((s: RootState) => s.auth.permissions);
  useEffect(() => setPermissions(reduxPerms), [reduxPerms]);

  /* --- helpers --- */
  const hasPerm = (perm: string) => permissions.includes(perm);

  /* -------------------------------------------------------------------- */
  /*                             life-cycle                               */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        if (authService.getAccessToken()) await refreshSession();
      } catch {
        authService.logout();
        setUser(null);
        setPermissions([]);
        localStorage.removeItem('permissions');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /* -------------------------------------------------------------------- */
  /*                     helpers internos                                  */
  /* -------------------------------------------------------------------- */
  const fetchPermissions = async (): Promise<string[]> => {
    try {
      const { data } = await apiClient.get('/usuarios/me/permissions/');
      setPermissions(data.permissions);
      return data.permissions;
    } catch (err) {
      console.error('Error fetching permissions', err);
      setPermissions([]);
      return [];
    }
  };

  /* -------------------------------------------------------------------- */
  /*                             acciones                                  */
  /* -------------------------------------------------------------------- */
  const refreshSession = async () => {
    const me = await authService.getMe();
    setUser(me);
    localStorage.setItem('user', JSON.stringify(me));
    await fetchPermissions();
  };

  const login = async (telefono: string, password: string) => {
    const {
      user: logged,
      must_change_password,
      notification,
      tokens,
    } = await authService.login({ telefono, password });

    handleBackendNotification({ success: true, notification });

    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);

    const loggedWithFlag = { ...logged, must_change_password };
    setUser(loggedWithFlag);
    localStorage.setItem('user', JSON.stringify(loggedWithFlag));

    await fetchPermissions();

    navigate(must_change_password ? '/change-password' : '/dashboard', {
      replace: true,
    });
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken');
      await apiClient.post('/usuarios/logout/', { refresh_token: refresh });
    } catch (err: any) {
      handleBackendNotification(err?.response?.data);
    } finally {
      authService.logout();
      setUser(null);
      setPermissions([]);
      localStorage.removeItem('permissions');
      navigate('/login');
    }
  };

  /* -------------------------------------------------------------------- */
  /*                            expose                                     */
  /* -------------------------------------------------------------------- */
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

/* ---------------- Hook ---------------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
