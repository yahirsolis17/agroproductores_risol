// src/global/utils/accessHelper.ts
import { User } from '../../modules/gestion_usuarios/services/authService';
import { ROLE_ACCESS } from '../constants/roleAccess';

export const canAccess = (user: User, moduleKey: keyof typeof ROLE_ACCESS): boolean => {
  return ROLE_ACCESS[moduleKey].includes(user.role);
};
