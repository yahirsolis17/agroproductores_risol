import React, { ComponentType, LazyExoticComponent, Suspense, lazy } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';

import ErrorBoundary from './ErrorBoundary';

type ComponentModule = Record<string, unknown>;

const LoadingScreen: React.FC<{ label?: string }> = ({ label = 'Cargando...' }) => (
  <Box
    width="100%"
    minHeight={{ xs: 'calc(100vh - 13rem)', lg: 'calc(100vh - 12rem)' }}
    display="grid"
    alignContent="start"
    gap={3}
    px={{ xs: 2, sm: 3 }}
    py={2}
  >
    <Box
      sx={{
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: '36px',
        background:
          'radial-gradient(circle at top left, rgba(14,116,144,0.14), transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,249,255,0.84))',
        boxShadow: '0 30px 90px rgba(15,23,42,0.08)',
        p: { xs: 3, sm: 4 },
      }}
    >
      <Skeleton variant="rounded" width={132} height={26} />
      <Skeleton variant="text" width="72%" height={60} sx={{ mt: 2 }} />
      <Skeleton variant="text" width="55%" height={36} />
      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={140}
            sx={{ borderRadius: '24px' }}
          />
        ))}
      </Box>
    </Box>
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      <Skeleton variant="rounded" height={280} sx={{ borderRadius: '30px' }} />
      <Skeleton variant="rounded" height={280} sx={{ borderRadius: '30px' }} />
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
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
