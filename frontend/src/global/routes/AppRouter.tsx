// src/global/routes/AppRouter.tsx
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import PrivateRoute from '../../components/common/PrivateRoute';
import RoleGuard from '../../components/common/RoleGuard';
import MainLayout from '../../components/layout/MainLayout';

import Login from '../../modules/gestion_usuarios/pages/Login';
import Dashboard from '../../modules/gestion_usuarios/pages/Dashboard';
import ChangePassword from '../../modules/gestion_usuarios/pages/ChangePassword';
import Unauthorized from '../../components/common/Unauthorized';

import { moduleRoutes } from './moduleRoutes';

function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Privadas con layout */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {moduleRoutes.map(({ path, allowedRoles, lazyComponent }, idx) => {
            const LazyComp = React.lazy(lazyComponent);
            return (
              <Route
                key={idx}
                path={path}
                element={
                  <RoleGuard allowed={allowedRoles}>
                    <Suspense fallback={<div>Cargando...</div>}>
                      <LazyComp />
                    </Suspense>
                  </RoleGuard>
                }
              />
            );
          })}
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="p-6 text-center">404 - Página no encontrada</div>} />
    </Routes>
  );
}

export default AppRouter;
