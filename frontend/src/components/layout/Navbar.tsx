// src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Button } from '@mui/material';
import { NAV_ITEMS } from '../../global/constants/navItems';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, hasPerm } = useAuth();
  const location = useLocation();
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);

/* ────────────────── visibilidad del navbar ────────────────── */
const isPublicScreen = ['/login'].includes(location.pathname);
const isForcedToChangePassword =
  location.pathname === '/change-password' && user?.must_change_password;

if (isPublicScreen || isForcedToChangePassword) return null;

  /* ────────────────── helpers ────────────────── */
  const isActive = (path: string) => location.pathname === path;

  /** Rutas visibles según permiso (NAV_ITEMS separamos por rol) */
  const filterByPerm = (role: 'admin' | 'usuario') =>
    NAV_ITEMS[role].filter(i => !i.perm || hasPerm(i.perm));

  /** Renderiza un menú desplegable */
  const renderMenu = (
    title: string,
    routes: { to: string; label: string }[],
  ) =>
    routes.length > 0 && (
      <div
        className="relative"
        onMouseEnter={() => setHoverMenu(title)}
        onMouseLeave={() => setHoverMenu(null)}
      >
        <button
          className={clsx(
            'text-sm transition-colors',
            hoverMenu === title || routes.some(r => isActive(r.to))
              ? 'text-primary font-semibold'
              : 'text-neutral-500',
          )}
        >
          {title}
        </button>

        <AnimatePresence>
          {hoverMenu === title && (
            <>
              {/* puente invisible entre botón y menú */}
              <div className="absolute h-2 w-full top-full" />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-[calc(100%+0.5rem)] w-56 bg-white border border-neutral-200 rounded-lg shadow-md z-50"
              >
                {routes.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={clsx(
                      'block px-4 py-2 text-sm transition',
                      isActive(to)
                        ? 'text-primary-light font-semibold bg-neutral-100'
                        : 'text-primary-dark hover:bg-neutral-200',
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );

  const role: 'admin' | 'usuario' = user?.role ?? 'usuario';
  const visibleRoutes = filterByPerm(role);

  /* ────────────────── render ────────────────── */
  return (
    <motion.nav
      className="bg-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* --- Logo y menús --- */}
      <div className="flex items-center space-x-6 relative">
        <Link to="/dashboard" className="text-xl font-bold text-primary-dark">
          Risol
        </Link>

        {isAuthenticated && (
          <>

            <Link
              to="/profile"
              className={clsx(
                'text-sm transition-colors',
                isActive('/profile')
                  ? 'text-primary font-semibold'
                  : 'text-neutral-500',
              )}
            >
              Mi Perfil
              
            </Link>
            {renderMenu(
              'Gestión de Usuarios',
              visibleRoutes.filter(r => r.to.match(/users?|register|activity/)),
            )}



            {renderMenu(
              'Gestión de Huerta',
              visibleRoutes.filter(r => r.to.match(/huerta|propietario|cosecha/)),
            )}
          </>
        )}
      </div>

      {/* --- Login / Logout --- */}
      <div>
        {isAuthenticated ? (
          <Button
            onClick={logout}
            variant="contained"
            color="primary"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 500, borderRadius: '8px' }}
          >
            Cerrar Sesión
          </Button>
        ) : (
          <Link
            to="/login"
            className="bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
          >
            Iniciar Sesión
          </Link>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
