// Reportes de Producción - generado por asistente IA (enero 2025)
import React from 'react';
import { useLocation } from 'react-router-dom';

const Reportes: React.FC = () => {
  const location = useLocation() as { state?: { tipo?: string; id?: number } };
  const { tipo, id } = location.state || {};

  return (
    <div style={{ padding: 16 }}>
      <h2>Reporte de producción</h2>
      {tipo && id ? (
        <p>Vista preliminar para {tipo} con ID {id}</p>
      ) : (
        <p>Seleccione un elemento desde las tablas para generar su reporte.</p>
      )}
    </div>
  );
};

export default Reportes;
