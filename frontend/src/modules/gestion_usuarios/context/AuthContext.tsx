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
  const navigate = useNavigate();

  // Carga inicial desde localStorage para que no se “pierdan” permisos si recargas la página
  const storedUser = authService.getUser();
  const storedPerms = JSON.parse(localStorage.getItem('permissions') || '[]');

  const [user, setUser] = useState<User | null>(storedUser);
  const [permissions, setPermissions] = useState<string[]>(storedPerms);
  const [loading, setLoading] = useState(true);

  /* helper para UI */
  const hasPerm = (perm: string) => permissions.includes(perm);

  /* ---------- montar ---------- */
  useEffect(() => {
    const init = async () => {
      try {
        // Si ya hay token, refresca sesión y permisos
        if (authService.getAccessToken()) {
          await refreshSession();
        }
      } catch {
        // Si falla, limpia todo
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

  /* ---------- helpers internos ---------- */
// después
const fetchPermissions = async () => {
  try {
    const response = await apiClient.get('/usuarios/me/permissions/');
    const permisos: string[] = response.data.data.permisos;
    setPermissions(permisos);           // ← ¡aquí guardas el array en tu estado!
    return permisos;
  } catch (error) {
    console.error('Error fetching permissions:', error);
    setPermissions([]);                 // en caso de fallo, tampoco te quedes con los anteriores
    return [];
  }
};


  /* ---------- acciones ---------- */
  const refreshSession = async () => {
    // obtiene datos básicos de usuario
    const me = await authService.getMe();
    setUser(me);
    localStorage.setItem('user', JSON.stringify(me));

    // obtiene permisos dinámicamente
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

    /* permisos dinámicos */
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
      // ignoramos fallo de logout
    } finally {
      authService.logout();
      setUser(null);
      setPermissions([]);
      localStorage.removeItem('permissions');
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
