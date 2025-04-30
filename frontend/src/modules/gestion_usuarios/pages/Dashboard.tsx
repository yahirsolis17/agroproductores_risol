// src/modules/gestion_usuarios/pages/Dashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  MdPeople,
  MdAdd,
  MdHistory,
  MdLocalFlorist,
  MdOutlineAssessment,
  MdPerson,
} from 'react-icons/md';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-5xl mx-auto bg-neutral-50">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl font-bold text-primary-dark mb-6"
      >
        ¡Hola, {user?.nombre} {user?.apellido}!
      </motion.h1>

      {/* Admin */}
      {user?.role === 'admin' && (
        <Section
          title="Panel de administración"
          cards={[
            { to: '/users-admin', icon: <MdPeople />, label: 'Gestionar usuarios' },
            { to: '/register', icon: <MdAdd />, label: 'Registrar usuario' },
            { to: '/activity-log', icon: <MdHistory />, label: 'Historial de actividades' },
            { to: '/huertas', icon: <MdLocalFlorist />, label: 'Módulo Huertas' },
            { to: '/cosechas', icon: <MdOutlineAssessment />, label: 'Módulo Cosechas' },
          ]}
        />
      )}

      {/* Usuario */}
      {user?.role === 'usuario' && (
        <Section
          title="Tu espacio de trabajo"
          cards={[
            { to: '/profile', icon: <MdPerson />, label: 'Perfil' },
            { to: '/huertas', icon: <MdLocalFlorist />, label: 'Ver huertas' },
            { to: '/cosechas', icon: <MdOutlineAssessment />, label: 'Ver cosechas' },
          ]}
        />
      )}
    </div>
  );
};

export default Dashboard;

/* -------------------------------------------------------------------- */
/*                           Helpers                                     */
/* -------------------------------------------------------------------- */
interface Card {
  to: string;
  icon: React.ReactNode;
  label: string;
}
interface SectionProps {
  title: string;
  cards: Card[];
}

const Section: React.FC<SectionProps> = ({ title, cards }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2 }}
    className="space-y-6"
  >
    <p className="text-lg font-semibold text-neutral-700">{title}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((c) => (
        <DashboardCard key={c.to} {...c} />
      ))}
    </div>
  </motion.div>
);

const DashboardCard: React.FC<Card> = ({ to, icon, label }) => (
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
