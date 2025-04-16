// src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Button } from '@mui/material';
import { NAV_ITEMS } from '../../global/constants/navItems';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);

  if (['/login', '/change-password'].includes(location.pathname)) return null;

  const isActive = (path: string) => location.pathname === path;

  const renderMenu = (title: string, routes: { to: string; label: string }[]) => (
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
            : 'text-neutral-700'
        )}
      >
        {title}
      </button>

      <AnimatePresence>
        {hoverMenu === title && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-md z-50"
          >
            {routes.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'block px-4 py-2 text-sm transition hover:bg-neutral-100',
                  isActive(to) ? 'text-primary font-semibold' : 'text-neutral-700'
                )}
              >
                {label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const userRole = user?.role || 'usuario';

  return (
    <motion.nav
      className="bg-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center space-x-6 relative">
        <Link to="/dashboard" className="text-xl font-bold text-primary-dark">
          Risol
        </Link>

        {isAuthenticated && NAV_ITEMS[userRole] && (
          <>
            {renderMenu('Gestión de Usuarios', NAV_ITEMS[userRole].filter(i =>
              i.to.includes('user') || i.to.includes('register') || i.to.includes('activity')
            ))}

            {renderMenu('Gestión de Huerta', NAV_ITEMS[userRole].filter(i =>
              i.to.includes('huerta') || i.to.includes('propietario') || i.to.includes('cosecha')
            ))}
          </>
        )}

        {isAuthenticated && userRole === 'usuario' && (
          <>
            <Link
              to="/dashboard"
              className={clsx(
                'text-sm transition-colors',
                isActive('/dashboard') ? 'text-primary font-semibold' : 'text-neutral-700'
              )}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={clsx(
                'text-sm transition-colors',
                isActive('/profile') ? 'text-primary font-semibold' : 'text-neutral-700'
              )}
            >
              Mi Perfil
            </Link>
          </>
        )}
      </div>

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
