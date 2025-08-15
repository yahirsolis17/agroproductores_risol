import { lazy, type ReactNode } from 'react';
import LazyRoot from '../../LazyRoot';
import type { Role } from '../constants/navItems';

const UsersAdmin        = lazy(() => import('../../modules/gestion_usuarios/pages/UsersAdmin'));
const ActivityLog       = lazy(() => import('../../modules/gestion_usuarios/pages/ActivityLog'));
const Register          = lazy(() => import('../../modules/gestion_usuarios/pages/Register'));
const Profile           = lazy(() => import('../../modules/gestion_usuarios/pages/Profile'));
const ChangePassword    = lazy(() => import('../../modules/gestion_usuarios/pages/ChangePassword'));

const Huertas           = lazy(() => import('../../modules/gestion_huerta/pages/Huertas'));
const Propietarios      = lazy(() => import('../../modules/gestion_huerta/pages/Propietarios'));
const Temporadas        = lazy(() => import('../../modules/gestion_huerta/pages/Temporadas'));
const Cosechas          = lazy(() => import('../../modules/gestion_huerta/pages/Cosechas'));
const FinanzasPorCosecha= lazy(() => import('../../modules/gestion_huerta/pages/FinanzasPorCosecha'));

interface ModuleRoute {
  path: string;
  module: string;
  allowedRoles: Role[];
  element: ReactNode;
}

export const moduleRoutes: ModuleRoute[] = [
  {
    path: '/users-admin',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    element: (
      <LazyRoot>
        <UsersAdmin />
      </LazyRoot>
    ),
  },
  {
    path: '/activity-log',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    element: (
      <LazyRoot>
        <ActivityLog />
      </LazyRoot>
    ),
  },
  {
    path: '/register',
    module: 'gestion_usuarios',
    allowedRoles: ['admin'],
    element: (
      <LazyRoot>
        <Register />
      </LazyRoot>
    ),
  },
  {
    path: '/profile',
    module: 'gestion_usuarios',
    allowedRoles: ['usuario', 'admin'],
    element: (
      <LazyRoot>
        <Profile />
      </LazyRoot>
    ),
  },
  {
    path: '/change-password',
    module: 'gestion_usuarios',
    allowedRoles: ['usuario', 'admin'],
    element: (
      <LazyRoot>
        <ChangePassword />
      </LazyRoot>
    ),
  },

  {
    path: '/huertas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: (
      <LazyRoot>
        <Huertas />
      </LazyRoot>
    ),
  },
  {
    path: '/propietarios',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: (
      <LazyRoot>
        <Propietarios />
      </LazyRoot>
    ),
  },
  {
    path: '/temporadas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: (
      <LazyRoot>
        <Temporadas />
      </LazyRoot>
    ),
  },
  {
    path: '/cosechas',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: (
      <LazyRoot>
        <Cosechas />
      </LazyRoot>
    ),
  },

  // 👉 NUEVA RUTA: Finanzas por Cosecha
  {
    // antes: '/finanzas'
    path: '/finanzas/:temporadaId/:cosechaId',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: (
      <LazyRoot>
        <FinanzasPorCosecha />
      </LazyRoot>
    ),
  },
];
