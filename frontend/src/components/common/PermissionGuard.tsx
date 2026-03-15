import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

interface Props {
  anyOf?: string[];
  allOf?: string[];
  children: React.ReactNode;
  redirectTo?: string;
}

const PermissionGuard: React.FC<Props> = ({
  anyOf,
  allOf,
  children,
  redirectTo = '/unauthorized',
}) => {
  const { isAdmin, hasPerm } = useAuth();

  if (isAdmin) {
    return <>{children}</>;
  }

  const passesAny = !anyOf || anyOf.length === 0 || anyOf.some((perm) => hasPerm(perm));
  const passesAll = !allOf || allOf.length === 0 || allOf.every((perm) => hasPerm(perm));

  if (!passesAny || !passesAll) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
