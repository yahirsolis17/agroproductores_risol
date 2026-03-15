import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../global/store/store';

import authService, { User } from '../services/authService';
import { isApiClientConfirmedAuthError, isApiClientTransportError } from '../../../global/api/apiClient';
import { fetchPermissionsThunk, loginSuccess, logout as logoutAction, logoutThunk } from '../../../global/store/authSlice';

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
  const dispatch = useAppDispatch();

  const { user, permissions } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);

  /* --- helpers --- */
  const hasPerm = (perm: string) => {
    if (user?.role === 'admin') return true;
    return permissions.includes(perm);
  };

  const syncPersistedSession = () => {
    const storedUser = authService.getUser();
    const storedToken = authService.getAccessToken();

    if (!storedUser || !storedToken) {
      dispatch(logoutAction());
      return;
    }

    dispatch(loginSuccess({
      user: storedUser,
      token: storedToken,
      permissions: authService.getPermissions(),
    }));
  };

  /* -------------------------------------------------------------------- */
  /*                             life-cycle                               */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        if (authService.getAccessToken()) {
          await refreshSession();
        } else if (authService.getUser()) {
          dispatch(logoutAction());
        }
      } catch (error: unknown) {
        if (isApiClientConfirmedAuthError(error)) {
          dispatch(logoutAction());
        } else if (isApiClientTransportError(error)) {
          syncPersistedSession();
        } else {
          syncPersistedSession();
        }
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [dispatch]);

  // 🔁 Refresco de permisos al recuperar foco de la ventana
  useEffect(() => {
    const onFocus = async () => {
      if (!authService.getAccessToken()) return;
      try {
        await fetchPermissions();
      } catch {
        /* no-op */
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  /* -------------------------------------------------------------------- */
  /*                     helpers internos                                  */
  /* -------------------------------------------------------------------- */
  const fetchPermissions = async (): Promise<string[]> => {
    try {
      // Dispatch thunk to unify Redux and Context permissions
      const result = await dispatch(fetchPermissionsThunk()).unwrap();
      return result;
    } catch {
      return [];
    }
  };

  /* -------------------------------------------------------------------- */
  /*                             acciones                                  */
  /* -------------------------------------------------------------------- */
  const refreshSession = async () => {
    const me = await authService.getMe();
    authService.setUser(me);
    const perms = await fetchPermissions();
    dispatch(loginSuccess({ user: me, token: authService.getAccessToken() || '', permissions: perms }));
  };

  const login = async (telefono: string, password: string) => {
    const {
      user: logged,
      must_change_password,
      tokens,
    } = await authService.login({ telefono, password });

    // Mostramos notificación (NotificationEngine ya ignora redirect para login_success)

    // (Los tokens ya se guardan en authService.login; repetimos por compat)

    const loggedWithFlag = { ...logged, must_change_password };

    const perms = await fetchPermissions();
    dispatch(loginSuccess({ user: loggedWithFlag, token: tokens.access, permissions: perms }));

    navigate(must_change_password ? '/change-password' : '/dashboard', {
      replace: true,
    });
  };

  const logout = async () => {
    await dispatch(logoutThunk());
    navigate('/login');
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
