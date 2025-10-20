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
    // antes: '/finanzas'
    path: '/finanzas/:temporadaId/:cosechaId',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/FinanzasPorCosecha')),
  },

  // 👉 NUEVAS RUTAS: Reportes
  {
    path: '/reportes/cosecha/:cosechaId',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/ReporteCosecha')),
  },
  {
    path: '/reportes/temporada/:temporadaId',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/ReporteTemporada')),
  },
  {
    path: '/reportes/huerta/:huertaId/perfil',
    module: 'gestion_huerta',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_huerta/pages/PerfilHuerta')),
  },

  // ─────────────────────────────────────────────────────────────
  // Gestión Bodega
  // ─────────────────────────────────────────────────────────────
  {
    path: '/bodega',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Bodegas')),
  },
  {
    path: '/bodega/:bodegaId/temporadas',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Temporadas')),
  },
  {
    path: '/bodega/tablero',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/TableroBodega')),
  },

  {
    path: '/bodega/:bodegaId/capturas',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Capturas')),
  },
  {
    path: '/bodega/:bodegaId/capturas/:recepcionId/clasificacion',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Clasificacion')),
  },
  {
    path: '/bodega/:bodegaId/inventarios',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Inventarios')),
  },
  {
    path: '/bodega/:bodegaId/logistica',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Logistica')),
  },
  {
    path: '/bodega/:bodegaId/gastos',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Gastos')),
  },
  {
    path: '/bodega/:bodegaId/cierres',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Cierres')),
  },
  {
    path: '/bodega/:bodegaId/reportes',
    module: 'gestion_bodega',
    allowedRoles: ['admin', 'usuario'],
    element: lazyRoute(() => import('../../modules/gestion_bodega/pages/Reportes')),
  },
];
