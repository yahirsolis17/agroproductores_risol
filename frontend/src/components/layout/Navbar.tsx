// src/components/layout/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';
import { NAV_ITEMS } from '../../global/constants/navItems';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {isAuthenticated && user && NAV_ITEMS[user.role].map(({ to, label }) => (
          <Link key={to} to={to} className="hover:underline">{label}</Link>
        ))}
      </div>

      <div>
        {isAuthenticated ? (
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">
            Cerrar Sesión
          </button>
        ) : (
          <Link to="/login" className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded">
            Iniciar Sesión
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
