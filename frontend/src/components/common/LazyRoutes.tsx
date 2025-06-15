// src/components/common/LazyRoutes.tsx
import React, { Suspense, lazy, LazyExoticComponent, ComponentType, ComponentPropsWithRef, } from 'react';
import { Box, CircularProgress, Typography,  } from '@mui/material';

import ErrorBoundary from './ErrorBoundary';   // 👈 ya lo tienes en /components/common

/* ──────────────────────────────────────────────────────────────
 * 🔹 Fallback visual genérico
 *    – Pantalla ocupando todo el contenedor
 *    – Centramos un spinner + texto opcional
 * ────────────────────────────────────────────────────────────── */
const LoadingScreen: React.FC<{ label?: string }> = ({ label = 'Cargando…' }) => (
  <Box
    width="100%"
    height="100%"
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

/* ──────────────────────────────────────────────────────────────
 * 🔹 Helper 1: lazyImport
 *    importación dinámica *con nombre de export* (no solo default)
 *    Ejemplo:
 *      const HuertasPage = lazyImport(() => import('../pages/Huertas'), 'default');
 *      const Dashboard   = lazyImport(() => import('../pages/Dashboard'), 'Dashboard');
 * ────────────────────────────────────────────────────────────── */
export function lazyImport<P extends object>(
  factory: () => Promise<any>,
  exportName: string = 'default',
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    const module = await factory();
    return { default: module[exportName] } as { default: ComponentType<P> };
  });
}


/* ──────────────────────────────────────────────────────────────
 * 🔹 Helper 2: Loadable
 *    Wrapea cualquier componente (lazy o normal) con:
 *      • <ErrorBoundary> – para capturar/desplegar errores de render
 *      • <Suspense> – para fallback de carga
 *    Opcional:
 *      • Puedes pasar un fallback custom si lo necesitas
 * ----------------------------------------------------------------
 *    Ejemplo:
 *      const LazyDashboard = Loadable(
 *        lazyImport(() => import('../pages/Dashboard'), 'default'),
 *        <LoadingScreen label="Cargando Dashboard…" />
 *      );
 * ────────────────────────────────────────────────────────────── */
export function Loadable<P extends object>(
  Comp: LazyExoticComponent<ComponentType<P>> | ComponentType<P>,
  fallback: React.ReactNode = <LoadingScreen />,
): React.FC<P> {
  const Wrapped = Comp as React.ComponentType<P>;

  // eslint-disable-next-line react/display-name
  return (props: ComponentPropsWithRef<typeof Wrapped>) => (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <Wrapped {...(props as P)} />
      </Suspense>
    </ErrorBoundary>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 🔹 Factory “de lujo” para rutas
 *    Devuelve directamente el componente listo para usar en react-router
 * ----------------------------------------------------------------
 *    Ejemplo:
 *      // 1️⃣  Importaciones
 *      import { RouteObject } from 'react-router-dom';
 *      import { lazyRoute } from '@/components/common/LazyRoutes';
 *
 *      // 2️⃣  Definición de rutas
 *      const routes: RouteObject[] = [
 *        { path: '/huertas',      element: lazyRoute(() => import('../pages/Huertas')) },
 *        { path: '/dashboard',    element: lazyRoute(() => import('../pages/Dashboard')) },
 *      ];
 * ────────────────────────────────────────────────────────────── */
export function lazyRoute(
  factory: () => Promise<any>,
  exportName = 'default',
  fallback?: React.ReactNode,
) {
  const LazyComp = lazyImport(factory, exportName);
  const Wrapped  = Loadable(LazyComp, fallback);

  // 👉 devolvemos el ELEMENTO, no el componente
  return <Wrapped />;
}

/* ──────────────────────────────────────────────────────────────
 *  👉 Exportación por defecto: LoadingScreen (útil si quieres
 *     usarlo fuera de este archivo)
 * ────────────────────────────────────────────────────────────── */
export default LoadingScreen;
