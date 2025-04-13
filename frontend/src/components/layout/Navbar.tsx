import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Button } from '@mui/material';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [hovering, setHovering] = useState(false);

  if (['/login', '/change-password'].includes(location.pathname)) return null;

  const isActive = (path: string) => location.pathname === path;

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

        {isAuthenticated && user && user.role === 'admin' && (
          <div
            className="relative"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <button
              className={clsx(
                "text-sm transition-colors",
                hovering || ['/register', '/users-admin', '/activity-log'].includes(location.pathname)
                  ? 'text-primary font-semibold'
                  : 'text-neutral-700'
              )}
            >
              Gestión de Usuarios
            </button>

            <AnimatePresence>
              {hovering && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-md z-50"
                >
                  <Link
                    to="/register"
                    className={clsx(
                      "block px-4 py-2 text-sm transition hover:bg-neutral-100",
                      isActive('/register') ? 'text-primary font-semibold' : 'text-neutral-700'
                    )}
                  >
                    Registrar
                  </Link>
                  <Link
                    to="/activity-log"
                    className={clsx(
                      "block px-4 py-2 text-sm transition hover:bg-neutral-100",
                      isActive('/activity-log') ? 'text-primary font-semibold' : 'text-neutral-700'
                    )}
                  >
                    Historial de Actividades
                  </Link>
                  <Link
                    to="/users-admin"
                    className={clsx(
                      "block px-4 py-2 text-sm transition hover:bg-neutral-100",
                      isActive('/users-admin') ? 'text-primary font-semibold' : 'text-neutral-700'
                    )}
                  >
                    Usuarios Registrados
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isAuthenticated && user?.role === 'usuario' && (
          <div className="flex space-x-4">
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
          </div>
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
