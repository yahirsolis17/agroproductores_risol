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
    // Podrías añadir aquí:
    { to: '/huertas', label: 'Huertas' },
    { to: '/propietarios', label: 'Propietarios' },
    // etc.
  ],
  usuario: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/profile', label: 'Perfil' },
    // Podrías añadir aquí:
    { to: '/huertas', label: 'Huertas' },
    { to: '/propietarios', label: 'Propietarios' },
  ],
};
