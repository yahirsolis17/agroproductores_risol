// src/global/routes/moduleRoutes.ts
import type { Role } from '../constants/navItems';

interface ModuleRoute {
  path: string;
  module: string;
  allowedRoles: Role[];
  lazyComponent: () => Promise<{ default: React.ComponentType<any> }>;
}

export const moduleRoutes: ModuleRoute[] = [
  {
    path: '/users-admin',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    lazyComponent: () => import('../../modules/gestion_usuarios/pages/UsersAdmin'),
  },
  {
    path: '/activity-log',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    lazyComponent: () => import('../../modules/gestion_usuarios/pages/ActivityLog'),
  },
  {
    path: '/register',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    lazyComponent: () => import('../../modules/gestion_usuarios/pages/Register'),
  },
  {
    path: '/profile',
    module: 'gestion_usuarios',
    allowedRoles: ['usuario', 'admin'],
    lazyComponent: () => import('../../modules/gestion_usuarios/pages/Profile'),
  },
  {
    path: '/change-password',
    module: 'gestion_usuarios',
    allowedRoles: ['usuario', 'admin'],
    lazyComponent: () => import('../../modules/gestion_usuarios/pages/ChangePassword'),
  },
];
