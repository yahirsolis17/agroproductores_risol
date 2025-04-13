// src/components/layout/Navbar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';
import { NAV_ITEMS } from '../../global/constants/navItems';
import { motion } from 'framer-motion';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // No muestres el navbar en /login o /change-password
  if (['/login', '/change-password'].includes(location.pathname)) return null;

  return (
    <motion.nav
      className="bg-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center space-x-6">
        <Link to="/dashboard" className="text-xl font-bold text-primary-dark">
          Risol
        </Link>

        {isAuthenticated && user && (
          <div className="flex space-x-4">
            {NAV_ITEMS[user.role].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm text-neutral-700 hover:text-primary transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        {isAuthenticated ? (
          <button
            onClick={logout}
            className="bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
          >
            Cerrar Sesión
          </button>
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
