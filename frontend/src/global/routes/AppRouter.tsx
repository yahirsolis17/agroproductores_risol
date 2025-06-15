// src/global/routes/AppRouter.tsx
import { Routes, Route } from 'react-router-dom';

import PrivateRoute from '../../components/common/PrivateRoute';
import RoleGuard    from '../../components/common/RoleGuard';
import MainLayout   from '../../components/layout/MainLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';

import Login        from '../../modules/gestion_usuarios/pages/Login';
import Dashboard    from '../../modules/gestion_usuarios/pages/Dashboard';
import Unauthorized from '../../components/common/Unauthorized';

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
        <Route path="/"         element={<Login />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* -------- PRIVADAS CON LAYOUT -------- */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

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
