import React, { ComponentType, LazyExoticComponent, Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

import ErrorBoundary from './ErrorBoundary';

type ComponentModule = Record<string, unknown>;

const LoadingScreen: React.FC<{ label?: string }> = ({ label = 'Cargando...' }) => (
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

export function lazyImport<P extends object, TModule extends ComponentModule>(
  factory: () => Promise<TModule>,
  exportName: keyof TModule | 'default' = 'default',
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    const module = await factory();
    const exported = module[exportName as keyof TModule];

    if (!exported) {
      throw new Error(`No se encontro el export "${String(exportName)}" en el modulo lazy.`);
    }

    return { default: exported as ComponentType<P> };
  });
}

export function Loadable<P extends object>(
  Comp: LazyExoticComponent<ComponentType<P>> | ComponentType<P>,
  fallback: React.ReactNode = <LoadingScreen />,
): React.FC<P> {
  const Wrapped = Comp as ComponentType<P>;

  const LoadableComponent: React.FC<P> = (props) => (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <Wrapped {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LoadableComponent.displayName = `Loadable(${Wrapped.displayName ?? Wrapped.name ?? 'Component'})`;
  return LoadableComponent;
}

export function lazyRoute<TModule extends ComponentModule>(
  factory: () => Promise<TModule>,
  exportName: keyof TModule | 'default' = 'default',
  fallback?: React.ReactNode,
) {
  const LazyComp = lazyImport(factory, exportName);
  const Wrapped = Loadable(LazyComp, fallback);

  return <Wrapped />;
}

export default LoadingScreen;
