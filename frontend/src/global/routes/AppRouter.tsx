// src/global/routes/AppRouter.tsx
import { Routes, Route } from 'react-router-dom';

import PrivateRoute from '../../components/common/PrivateRoute';
import RoleGuard    from '../../components/common/RoleGuard';
import PermissionGuard from '../../components/common/PermissionGuard';
import MainLayout   from '../../components/layout/MainLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { lazyRoute } from '../../components/common/LazyRoutes';

import { moduleRoutes } from './moduleRoutes';

const loginRouteElement = lazyRoute(() => import('../../modules/gestion_usuarios/pages/Login'));
const dashboardRouteElement = lazyRoute(() => import('../../modules/gestion_usuarios/pages/Dashboard'));
const unauthorizedRouteElement = lazyRoute(() => import('../../components/common/Unauthorized'));

function AppRouter() {
  return (
    <ErrorBoundary fallback={
      <div className="p-6 text-red-600">
        Ha ocurrido un error inesperado.
      </div>
    }>
      <Routes>
        {/* ---------- PÚBLICAS ---------- */}
        <Route path="/"         element={loginRouteElement} />
        <Route path="/login"    element={loginRouteElement} />
        <Route path="/unauthorized" element={unauthorizedRouteElement} />

        {/* -------- PRIVADAS CON LAYOUT -------- */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={dashboardRouteElement} />

            {moduleRoutes.map(({ path, allowedRoles, requiredPermissionsAny, requiredPermissionsAll, element }, idx) => (
              <Route
                key={idx}
                path={path}
                element={
                  <RoleGuard allowed={allowedRoles}>
                    <PermissionGuard anyOf={requiredPermissionsAny} allOf={requiredPermissionsAll}>
                      {element}
                    </PermissionGuard>
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
