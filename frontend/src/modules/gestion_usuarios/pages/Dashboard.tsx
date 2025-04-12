// src/modules/gestion_usuarios/pages/Dashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Bienvenido, {user?.nombre} {user?.apellido}
      </h1>

      {/* -------- Panel ADMIN -------- */}
      {user?.role === 'admin' && (
        <div className="space-y-2">
          <p className="font-semibold">Panel de administración</p>
          <ul className="list-disc ml-6">
            <li><Link to="/users-admin"    className="text-blue-600 hover:underline">Gestionar usuarios</Link></li>
            <li><Link to="/register"       className="text-blue-600 hover:underline">Registrar usuario</Link></li>
            <li><Link to="/activity-log"   className="text-blue-600 hover:underline">Historial de actividades</Link></li>
            <li><Link to="/huertas"        className="text-blue-600 hover:underline">Módulo Huertas</Link></li>
            <li><Link to="/cosechas"       className="text-blue-600 hover:underline">Módulo Cosechas</Link></li>
          </ul>
        </div>
      )}

      {/* -------- Panel USUARIO -------- */}
      {user?.role === 'usuario' && (
        <div className="space-y-2">
          <p className="font-semibold">Tu espacio de trabajo</p>
          <ul className="list-disc ml-6">
            <li><Link to="/profile"        className="text-blue-600 hover:underline">Perfil</Link></li>
            <li><Link to="/huertas"        className="text-blue-600 hover:underline">Ver huertas</Link></li>
            <li><Link to="/cosechas"       className="text-blue-600 hover:underline">Ver cosechas</Link></li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
