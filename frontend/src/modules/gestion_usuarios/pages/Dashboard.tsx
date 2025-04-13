// src/modules/gestion_usuarios/pages/Dashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { MdPeople, MdAdd, MdHistory, MdLocalFlorist, MdOutlineAssessment, MdPerson } from 'react-icons/md';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.h1
        className="text-3xl font-bold text-primary-dark mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        ¡Hola, {user?.nombre} {user?.apellido}!
      </motion.h1>

      {user?.role === 'admin' && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-lg font-semibold text-neutral-700">Panel de administración</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DashboardCard to="/users-admin" icon={<MdPeople />} label="Gestionar usuarios" />
            <DashboardCard to="/register" icon={<MdAdd />} label="Registrar usuario" />
            <DashboardCard to="/activity-log" icon={<MdHistory />} label="Historial de actividades" />
            <DashboardCard to="/huertas" icon={<MdLocalFlorist />} label="Módulo Huertas" />
            <DashboardCard to="/cosechas" icon={<MdOutlineAssessment />} label="Módulo Cosechas" />
          </div>
        </motion.div>
      )}

      {user?.role === 'usuario' && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-lg font-semibold text-neutral-700">Tu espacio de trabajo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DashboardCard to="/profile" icon={<MdPerson />} label="Perfil" />
            <DashboardCard to="/huertas" icon={<MdLocalFlorist />} label="Ver huertas" />
            <DashboardCard to="/cosechas" icon={<MdOutlineAssessment />} label="Ver cosechas" />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;

interface CardProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const DashboardCard: React.FC<CardProps> = ({ to, icon, label }) => {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Link
        to={to}
        className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-soft border border-neutral-200 hover:bg-neutral-100 transition-colors duration-200"
      >
        <div className="text-primary-dark text-3xl">{icon}</div>
        <span className="text-lg font-medium text-neutral-700">{label}</span>
      </Link>
    </motion.div>
  );
};
