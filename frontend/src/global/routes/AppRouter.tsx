// src/global/routes/AppRouter.tsx
import { Routes, Route } from 'react-router-dom';
import { lazy } from 'react';

import PrivateRoute from '../../components/common/PrivateRoute';
import RoleGuard    from '../../components/common/RoleGuard';
import MainLayout   from '../../components/layout/MainLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import LazyRoot from '../../LazyRoot';

const Login        = lazy(() => import('../../modules/gestion_usuarios/pages/Login'));
const Dashboard    = lazy(() => import('../../modules/gestion_usuarios/pages/Dashboard'));
const Unauthorized = lazy(() => import('../../components/common/Unauthorized'));

import { moduleRoutes } from './moduleRoutes';

function AppRouter() {
  return (
    <ErrorBoundary fallback={
      <div className="p-6 text-red-600">
        Ha ocurrido un error inesperado.
      </div>
    }>
      <Routes>
        {/* ---------- PÚBLICAS ---------- */}
        <Route path="/"         element={<LazyRoot><Login /></LazyRoot>} />
        <Route path="/login"    element={<LazyRoot><Login /></LazyRoot>} />
        <Route path="/unauthorized" element={<LazyRoot><Unauthorized /></LazyRoot>} />

        {/* -------- PRIVADAS CON LAYOUT -------- */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<LazyRoot><Dashboard /></LazyRoot>} />

            {moduleRoutes.map(({ path, allowedRoles, element }, idx) => (
              <Route
                key={idx}
                path={path}
                element={
                  <RoleGuard allowed={allowedRoles}>
                    {element}
                    
                  </RoleGuard>
                }
              />
            ))}
          </Route>
        </Route>

        {/* ------------ 404 ------------- */}
        <Route
          path="*"
          element={
            <div className="p-6 text-center">
              404 – Página no encontrada
            </div>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default AppRouter;
