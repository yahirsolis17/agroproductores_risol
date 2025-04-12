// src/components/common/IfRole.tsx
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

export const IfAdmin = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : null;
};

export const IfUser = ({ children }: { children: React.ReactNode }) => {
  const { isUser } = useAuth();
  return isUser ? <>{children}</> : null;
};
