// src/components/common/RoleGuard.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

interface Props {
  allowed: ('admin' | 'usuario')[];
  children: React.ReactNode;
  redirectTo?: string;
}

const RoleGuard: React.FC<Props> = ({ allowed, children, redirectTo = '/unauthorized' }) => {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
