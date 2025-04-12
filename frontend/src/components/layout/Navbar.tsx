import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">

        {isAuthenticated && user?.role === 'admin' && (
          <>
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <Link to="/users-admin" className="hover:underline">Gestionar Usuarios</Link>
            <Link to="/register" className="hover:underline">Registrar Usuario</Link>
            <Link to="/activity-log" className="hover:underline">Historial de Actividades</Link>
            {/* Agrega otros enlaces para admin aquí */}
          </>
        )}
          {user?.role === 'usuario' && (
            <>
              <Link to="/dashboard" className="hover:underline">Dashboard</Link>
              <Link to="/profile"  className="hover:underline">Perfil</Link>
              <Link to="/huertas"  className="hover:underline">Huertas</Link>
              <Link to="/cosechas" className="hover:underline">Cosechas</Link>
            </>
          )}
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
