export type Role = 'admin' | 'usuario';

export interface NavItem {
  to: string;
  label: string;
  description?: string;
  perm?: string;
}

export interface NavSection {
  id: string;
  label: string;
  summary: string;
  matchPrefixes: string[];
  items: NavItem[];
}

export interface NavConfig {
  home: NavItem;
  profile: NavItem;
  sections: NavSection[];
}

type AccessChecker = (perm: string) => boolean;

const adminConfig: NavConfig = {
  home: {
    to: '/dashboard',
    label: 'Inicio',
    description: 'Centro operativo del sistema.',
  },
  profile: {
    to: '/profile',
    label: 'Mi perfil',
    description: 'Datos personales, sesion y seguridad.',
  },
  sections: [
    {
      id: 'usuarios',
      label: 'Usuarios',
      summary: 'Altas, permisos y trazabilidad administrativa.',
      matchPrefixes: ['/users-admin', '/register', '/activity-log'],
      items: [
        { to: '/users-admin', label: 'Administrar usuarios', description: 'Activos, archivados y permisos.' },
        { to: '/register', label: 'Registrar usuario', description: 'Crear cuentas con acceso inicial.' },
        { to: '/activity-log', label: 'Actividad', description: 'Auditoria de movimientos del sistema.' },
      ],
    },
    {
      id: 'huerta',
      label: 'Huerta',
      summary: 'Operacion agricola, seguimiento y reportes de produccion.',
      matchPrefixes: ['/huertas', '/propietarios', '/temporadas', '/cosechas', '/finanzas', '/reportes'],
      items: [
        { to: '/huertas', label: 'Huertas', description: 'Catalogo principal de huertas.', perm: 'view_huerta' },
        { to: '/propietarios', label: 'Propietarios', description: 'Relacion con propietarios y rentas.', perm: 'view_propietario' },
      ],
    },
    {
      id: 'bodega',
      label: 'Bodega',
      summary: 'Operacion diaria, tablero, inventarios, logistica y reportes.',
      matchPrefixes: ['/bodega'],
      items: [
        { to: '/bodega', label: 'Bodegas', description: 'Selecciona bodega y temporada antes de entrar a la operacion.', perm: 'view_bodega' },
      ],
    },
  ],
};

const userConfig: NavConfig = {
  home: {
    to: '/dashboard',
    label: 'Inicio',
    description: 'Resumen de accesos disponibles.',
  },
  profile: {
    to: '/profile',
    label: 'Mi perfil',
    description: 'Tu cuenta y configuracion basica.',
  },
  sections: [
    {
      id: 'huerta',
      label: 'Huerta',
      summary: 'Consulta operativa de huertas, temporadas y cosechas.',
      matchPrefixes: ['/huertas', '/propietarios', '/temporadas', '/cosechas', '/finanzas', '/reportes'],
      items: [
        { to: '/huertas', label: 'Huertas', description: 'Consulta de huertas activas.', perm: 'view_huerta' },
        { to: '/propietarios', label: 'Propietarios', description: 'Consulta de propietarios.', perm: 'view_propietario' },
      ],
    },
    {
      id: 'bodega',
      label: 'Bodega',
      summary: 'Operacion de bodega segun permisos disponibles.',
      matchPrefixes: ['/bodega'],
      items: [
        { to: '/bodega', label: 'Bodegas', description: 'Selecciona una bodega y su temporada activa antes de operar.', perm: 'view_bodega' },
      ],
    },
  ],
};

export const NAV_CONFIG: Record<Role, NavConfig> = {
  admin: adminConfig,
  usuario: userConfig,
};

export const getVisibleNavigation = (
  role: Role,
  hasPerm: AccessChecker,
): NavConfig => {
  const base = NAV_CONFIG[role] ?? NAV_CONFIG.usuario;

  return {
    home: base.home,
    profile: base.profile,
    sections: base.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.perm || hasPerm(item.perm)),
      }))
      .filter((section) => section.items.length > 0),
  };
};

export const NAV_ITEMS: Record<Role, NavItem[]> = Object.fromEntries(
  Object.entries(NAV_CONFIG).map(([role, config]) => [
    role,
    [config.home, config.profile, ...config.sections.flatMap((section) => section.items)],
  ]),
) as Record<Role, NavItem[]>;
