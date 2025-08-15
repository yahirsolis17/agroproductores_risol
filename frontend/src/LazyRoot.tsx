import { Suspense } from 'react';

interface LazyRootProps {
  children: React.ReactNode;
}

export default function LazyRoot({ children }: LazyRootProps) {
  return (
    <Suspense fallback={<div className="p-4 text-center">Cargando...</div>}>
      {children}
    </Suspense>
  );
}
