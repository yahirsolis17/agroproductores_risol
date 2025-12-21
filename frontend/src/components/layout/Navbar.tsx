import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { NAV_ITEMS } from '../../global/constants/navItems';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

const Navbar: React.FC = () => {
  // Hooks de auth y routing: SIEMPRE en top-level y en el mismo orden
  const { user, isAuthenticated, logout, hasPerm } = useAuth();
  const location = useLocation();

  // State local: también en top-level y orden fijo
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);
  const [openLogout, setOpenLogout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState<string | null>(null);

  /* ────────────────── helpers ────────────────── */
  const isActive = (path: string) => location.pathname === path;

  // Role efectivo del usuario
  const role: 'admin' | 'usuario' = user?.role ?? 'usuario';

  /** Rutas visibles según permisos (llamado SIEMPRE) */
  const visibleRoutes = useMemo(
    () => (NAV_ITEMS[role] ?? []).filter(i => !i.perm || hasPerm?.(i.perm)),
    [role, hasPerm]
  );

  /** Submenús (llamados SIEMPRE, aunque luego no se rendericen) */
  const userManagementRoutes = useMemo(
    () => visibleRoutes.filter(r => /users?|register|activity/.test(r.to)),
    [visibleRoutes]
  );

  const gardenManagementRoutes = useMemo(
    () => visibleRoutes.filter(r => /huerta|propietario|cosecha|temporad/i.test(r.to)),
    [visibleRoutes]
  );

  const warehouseManagementRoutes = useMemo(
    () => visibleRoutes.filter(r => /^\/bodega(\/|$)/.test(r.to)),
    [visibleRoutes]
  );

  /* ────────────────── visibilidad del navbar ────────────────── */
  const shouldHideNavbar =
    location.pathname === '/login' ||
    (location.pathname === '/change-password' && user?.must_change_password);

  /** Renderiza un menú desplegable DESKTOP (no usa hooks) */
  const renderDesktopMenu = (
    title: string,
    routes: { to: string; label: string }[]
  ) => {
    if (routes.length === 0) return null;

    const isMenuActive = hoverMenu === title || routes.some(r => isActive(r.to));

    return (
      <div
        className="relative"
        onMouseEnter={() => setHoverMenu(title)}
        onMouseLeave={() => setHoverMenu(null)}
      >
        <button
          className={clsx(
            'text-sm transition-colors whitespace-nowrap',
            isMenuActive ? 'text-primary font-semibold' : 'text-neutral-500',
          )}
          aria-haspopup="true"
          aria-expanded={isMenuActive}
        >
          {title}
        </button>

        <AnimatePresence>
          {hoverMenu === title && (
            <>
              <div className="absolute h-2 w-full top-full" />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-[calc(100%+0.5rem)] w-56 bg-white border border-neutral-200 rounded-lg shadow-md z-50"
              >
                {routes.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={clsx(
                      'block px-4 py-2 text-sm transition',
                      isActive(to)
                        ? 'text-primary-light font-semibold bg-neutral-100'
                        : 'text-primary-dark hover:bg-neutral-200',
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  /** Renderiza un menú desplegable MOBILE */
  const renderMobileMenu = (
    title: string,
    routes: { to: string; label: string }[]
  ) => {
    if (routes.length === 0) return null;

    const isOpen = mobileSubmenuOpen === title;

    return (
      <div className="border-b border-neutral-200">
        <button
          onClick={() => setMobileSubmenuOpen(isOpen ? null : title)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-neutral-700 hover:bg-neutral-50 transition"
        >
          <span className="font-medium">{title}</span>
          <svg
            className={clsx(
              'w-4 h-4 transition-transform',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-neutral-50"
            >
              {routes.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMobileSubmenuOpen(null);
                  }}
                  className={clsx(
                    'block px-6 py-2.5 text-sm transition',
                    isActive(to)
                      ? 'text-primary-light font-semibold bg-neutral-100'
                      : 'text-neutral-600 hover:bg-neutral-100',
                  )}
                >
                  {label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  /* ────────────────── retorno ────────────────── */
  if (shouldHideNavbar) return null;

  // Determina si hay contenido para mostrar en el menú móvil
  const hasMobileContent = isAuthenticated && (
    userManagementRoutes.length > 0 ||
    gardenManagementRoutes.length > 0 ||
    warehouseManagementRoutes.length > 0
  );

  return (
    <>
      <motion.nav
        className="bg-white shadow-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* --- Logo y menús --- */}
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-primary-dark">
            Risol
          </Link>

          {isAuthenticated && (
            <>
              {/* Mi Perfil - visible en desktop */}
              <Link
                to="/profile"
                className={clsx(
                  'hidden md:block text-sm transition-colors',
                  isActive('/profile') ? 'text-primary font-semibold' : 'text-neutral-500',
                )}
              >
                Mi Perfil
              </Link>

              {/* Menús desplegables - solo desktop */}
              <div className="hidden md:flex items-center space-x-4 md:space-x-6">
                {renderDesktopMenu('Gestión de Usuarios', userManagementRoutes)}
                {renderDesktopMenu('Gestión de Huerta', gardenManagementRoutes)}
                {renderDesktopMenu('Gestión de Bodega', warehouseManagementRoutes)}
              </div>
            </>
          )}
        </div>

        {/* --- Botones de acción --- */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Botón cerrar sesión - solo desktop */}
              <Button
                onClick={() => setOpenLogout(true)}
                variant="contained"
                color="primary"
                size="small"
                className="hidden md:inline-flex"
                sx={{ textTransform: 'none', fontWeight: 500, borderRadius: '8px' }}
              >
                Cerrar Sesión
              </Button>

              {/* Botón hamburguesa - solo si hay contenido que mostrar */}
              {hasMobileContent && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-neutral-100 transition"
                  aria-label="Abrir menú"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              )}
            </>
          ) : (
            /* Botón login - visible en todas las pantallas */
            <Link
              to="/login"
              className="bg-green-500 text-white px-3 sm:px-4 py-1.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </motion.nav>

      {/* --- DIALOG de confirmación de logout --- */}
      <Dialog open={openLogout} onClose={() => setOpenLogout(false)}>
        <DialogTitle>Confirmar cierre de sesión</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas cerrar sesión?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogout(false)}>Cancelar</Button>
          <Button
            color="error"
            onClick={() => {
              setOpenLogout(false);
              logout();
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MENÚ MÓVIL --- */}
      <AnimatePresence>
        {mobileMenuOpen && hasMobileContent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileSubmenuOpen(null);
              }}
            />

            {/* Panel del menú */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed top-0 right-0 bottom-0 w-[280px] sm:w-[320px] bg-white shadow-2xl z-50 md:hidden overflow-y-auto"
            >
              {/* Header del menú móvil */}
              <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-4 flex items-center justify-between">
                <span className="font-bold text-lg text-primary-dark">Menú</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMobileSubmenuOpen(null);
                  }}
                  className="p-1 rounded-lg hover:bg-neutral-100 transition"
                  aria-label="Cerrar menú"
                >
                  <svg className="w-5 h-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="py-2">
                {/* Mi Perfil */}
                <Link
                  to="/profile"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMobileSubmenuOpen(null);
                  }}
                  className={clsx(
                    'block px-4 py-3 border-b border-neutral-200 transition',
                    isActive('/profile')
                      ? 'text-primary font-semibold bg-neutral-50'
                      : 'text-neutral-700 hover:bg-neutral-50',
                  )}
                >
                  Mi Perfil
                </Link>

                {/* Submenús */}
                {renderMobileMenu('Gestión de Usuarios', userManagementRoutes)}
                {renderMobileMenu('Gestión de Huerta', gardenManagementRoutes)}
                {renderMobileMenu('Gestión de Bodega', warehouseManagementRoutes)}

                {/* Cerrar Sesión en mobile */}
                <div className="px-4 py-4 mt-2">
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileSubmenuOpen(null);
                      setOpenLogout(true);
                    }}
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ textTransform: 'none', fontWeight: 500, borderRadius: '8px' }}
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;