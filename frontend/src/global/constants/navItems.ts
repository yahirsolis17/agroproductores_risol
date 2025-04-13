// src/global/constants/navItems.ts
export type Role = 'admin' | 'usuario';

interface NavItem {
  to: string;
  label: string;
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'Inicio' },
    { to: '/users-admin', label: 'Gestionar Usuarios' },
    { to: '/register', label: 'Registrar Usuario' },
    { to: '/activity-log', label: 'Historial de Actividades' },
  ],
  usuario: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/profile', label: 'Perfil' },
    { to: '/huertas', label: 'Huertas' },
    { to: '/cosechas', label: 'Cosechas' },
  ],
};
