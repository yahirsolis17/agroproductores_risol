import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { isApiClientConfirmedAuthError, isApiClientTransportError } from '../../../global/api/apiClient';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { fetchPermissionsThunk, loginSuccess, logout as logoutAction, logoutThunk } from '../../../global/store/authSlice';
import authService, { User } from '../services/authService';

interface AuthContextProps {
  user: User | null;
  permissions: string[];
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  hasPerm: (perm: string) => boolean;
  login: (telefono: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { user, permissions } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);
  const initStartedRef = useRef(false);

  const hasPerm = (perm: string) => {
    if (user?.role === 'admin') return true;
    return permissions.includes(perm);
  };

  const syncPersistedSession = useCallback(() => {
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
  }, [dispatch]);

  const fetchPermissions = useCallback(async (): Promise<string[]> => {
    return dispatch(fetchPermissionsThunk()).unwrap();
  }, [dispatch]);

  const fetchPermissionsWithFallback = useCallback(async (): Promise<string[]> => {
    try {
      return await fetchPermissions();
    } catch (error: unknown) {
      if (isApiClientTransportError(error)) {
        return authService.getPermissions();
      }

      throw error;
    }
  }, [fetchPermissions]);

  const refreshSession = useCallback(async () => {
    const [me, perms] = await Promise.all([
      authService.getMe(),
      fetchPermissionsWithFallback(),
    ]);

    authService.setUser(me);
    dispatch(loginSuccess({
      user: me,
      token: authService.getAccessToken() || '',
      permissions: perms,
    }));
  }, [dispatch, fetchPermissionsWithFallback]);

  const login = async (telefono: string, password: string) => {
    const {
      user: logged,
      must_change_password,
      tokens,
    } = await authService.login({ telefono, password });

    const loggedWithFlag = { ...logged, must_change_password };
    const perms = await fetchPermissionsWithFallback();

    dispatch(loginSuccess({
      user: loggedWithFlag,
      token: tokens.access,
      permissions: perms,
    }));

    navigate(must_change_password ? '/change-password' : '/dashboard', {
      replace: true,
    });
  };

  const logout = async () => {
    await dispatch(logoutThunk());
    navigate('/login');
  };

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let active = true;

    const init = async () => {
      const hasToken = Boolean(authService.getAccessToken());
      const storedUser = authService.getUser();

      try {
        if (hasToken && storedUser) {
          syncPersistedSession();
          if (active) {
            setLoading(false);
          }
          await refreshSession();
          return;
        }

        if (hasToken) {
          await refreshSession();
        } else if (storedUser) {
          dispatch(logoutAction());
        }
      } catch (error: unknown) {
        if (!active) return;

        if (isApiClientConfirmedAuthError(error)) {
          dispatch(logoutAction());
        } else if (isApiClientTransportError(error)) {
          syncPersistedSession();
        } else {
          syncPersistedSession();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, [dispatch, refreshSession, syncPersistedSession]);

  useEffect(() => {
    const onFocus = async () => {
      if (!authService.getAccessToken()) return;

      try {
        await fetchPermissions();
      } catch {
        // Ignore focus refresh failures.
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchPermissions]);

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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
