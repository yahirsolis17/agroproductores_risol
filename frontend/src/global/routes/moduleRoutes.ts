import { lazyRoute } from '../../components/common/LazyRoutes';
import type { Role } from '../constants/navItems';

interface ModuleRoute {
  path: string;
  module: string;
  allowedRoles: Role[];
  element: React.ReactNode;
}

export const moduleRoutes: ModuleRoute[] = [
  {
    path: '/users-admin',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    element: lazyRoute(() => import('../../modules/gestion_usuarios/pages/UsersAdmin')),
  },
  {
    path: '/activity-log',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    element: lazyRoute(() => import('../../modules/gestion_usuarios/pages/ActivityLog')),
  },
  {
    path: '/register',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    element: lazyRoute(() => import('../../modules/gestion_usuarios/pages/Register')),
  },
  {
    path: '/profile',
    module: 'gestion_usuarios',
    allowedRoles: ['usuario', 'admin'],
    element: lazyRoute(() => import('../../modules/gestion_usuarios/pages/Profile')),
  },
  {
    path: '/change-password',
    module: 'gestion_usuarios',
    allowedRoles: ['usuario', 'admin'],
    element: lazyRoute(() => import('../../modules/gestion_usuarios/pages/ChangePassword')),
  },

  {
    path: '/huertas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/Huertas')),
  },
  {
    path: '/propietarios',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/Propietarios')),
  },
  {
    path: '/temporadas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/Temporadas')),
  },
  {
    path: '/cosechas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/Cosechas')),
  },

  // 👉 NUEVA RUTA: Finanzas por Cosecha
  {
    path: '/finanzas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/FinanzasPorCosecha')),
  },
];
