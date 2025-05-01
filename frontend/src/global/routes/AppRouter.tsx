// src/global/routes/AppRouter.tsx
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import PrivateRoute from '../../components/common/PrivateRoute';
import RoleGuard    from '../../components/common/RoleGuard';
import MainLayout   from '../../components/layout/MainLayout';
import  ErrorBoundary  from '../../components/common/ErrorBoundary';   // 🆕

// páginas públicas
import Login         from '../../modules/gestion_usuarios/pages/Login';
import Dashboard     from '../../modules/gestion_usuarios/pages/Dashboard';
import Unauthorized  from '../../components/common/Unauthorized';

import { moduleRoutes } from './moduleRoutes';

function AppRouter() {
  return (
    <ErrorBoundary fallback={<div className="p-6 text-red-600">Ha ocurrido un error inesperado puta.</div>}>
      <Routes>
        {/* ------------ Públicas ------------ */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* -------- Privadas con layout ----- */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            {moduleRoutes.map(({ path, allowedRoles, lazyComponent }, idx) => {
              const LazyComp = React.lazy(lazyComponent);
              return (
                <Route
                  key={idx}
                  path={path}
                  element={
                    <RoleGuard allowed={allowedRoles}>
                      <Suspense fallback={
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 primary-dark-500"></div>
                        <span className="ml-3 text-lg text-gray-600">Cargando...</span>
                      </div>
                      }>
                      <LazyComp />
                      </Suspense>
                    </RoleGuard>
                  }
                />
              );
            })}
          </Route>
        </Route>

        {/* -------- Ruta 404 -------------- */}
        <Route
          path="*"
          element={<div className="p-6 text-center">404 – Página no encontrada</div>}
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default AppRouter;
