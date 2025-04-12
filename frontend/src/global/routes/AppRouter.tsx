import { Routes, Route } from 'react-router-dom';
import Login from '../../modules/gestion_usuarios/pages/Login';
import Dashboard from '../../modules/gestion_usuarios/pages/Dashboard';
import Profile from '../../modules/gestion_usuarios/pages/Profile';
import ChangePassword from '../../modules/gestion_usuarios/pages/ChangePassword';
import ActivityLog from '../../modules/gestion_usuarios/pages/ActivityLog';
import Register from '../../modules/gestion_usuarios/pages/Register';
import UsersAdmin from '../../modules/gestion_usuarios/pages/UsersAdmin';
import Unauthorized from '../../../src/components/common/Unauthorized';

// Layout y PrivateRoute
import MainLayout from '../../../src/components/layout/MainLayout';
import PrivateRoute from '../../../src/components/common/PrivateRoute';

function AppRouter() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Rutas protegidas -> envueltas con PrivateRoute y MainLayout */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          {/* Routes genéricas: con Navbar y Footer */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/change-password" element={<ChangePassword />} />
          
          {/* Rutas sólo para admin con PrivateRoute adicional si lo deseas */}
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/register" element={<Register />} />
          <Route path="/users-admin" element={<UsersAdmin />} />

          {/* Rutas para usuarios normales */}
          <Route path="/profile" element={<Profile />} />

        </Route>
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={<div className="p-6 text-center">404 - Página no encontrada</div>}
      />
    </Routes>
  );
}

export default AppRouter;
