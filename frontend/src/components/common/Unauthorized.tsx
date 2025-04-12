// src/modules/gestion_usuarios/pages/Unauthorized.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';

const Unauthorized: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-center px-4">
      <FaLock className="text-6xl text-red-500 mb-4" />
      <h1 className="text-3xl font-bold text-red-600 mb-2">Acceso Denegado</h1>
      <p className="text-gray-700 mb-6">
        No tienes permisos suficientes para ver esta página.
      </p>
      <Link
        to="/dashboard"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Volver al Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
