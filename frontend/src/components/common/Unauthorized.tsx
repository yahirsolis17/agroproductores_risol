// src/modules/gestion_usuarios/pages/Unauthorized.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-center px-4">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="mb-4 h-16 w-16 text-red-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
        <path d="M8 10V7.8a4 4 0 1 1 8 0V10" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
      </svg>
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
