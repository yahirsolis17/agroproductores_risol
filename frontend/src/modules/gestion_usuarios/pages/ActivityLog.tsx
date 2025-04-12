// src/modules/gestion_usuarios/pages/ActivityLog.tsx
import React, { useEffect, useState } from 'react';
import apiClient from '../../../global/api/apiClient';
import { useAuth } from '../context/AuthContext'; // <- CORREGIDO

interface Activity {
  id: number;
  usuario: number;
  accion: string;
  fecha_hora: string;
  detalles?: string;
}

const ActivityLog: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      const response = await apiClient.get('/usuarios/actividad/');

      setActivities(response.data);
    } catch {
      setError('No se pudo obtener el historial de actividades.');
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Acceso denegado</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Historial de Actividades</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <ul>
        {activities.map((act) => (
          <li key={act.id} className="mb-2 border-b pb-2">
            <span className="font-semibold">{act.fecha_hora}</span> - {act.accion}
            {act.detalles && <span> ({act.detalles})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityLog;
