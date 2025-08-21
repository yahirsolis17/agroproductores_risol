import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
// Corrige la ruta (evita "../../../src/..."); usa relativa limpia o alias si tienes "@"
import Breadcrumbs from '../../modules/gestion_huerta/components/common/Breadcrumbs';

const MainLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />

    {/* role="main" → landmark para lectores de pantalla */}
    <div role="main" className="flex-grow px-4 py-6">
      <Breadcrumbs />
      <Outlet />
    </div>

    <Footer />
  </div>
);

export default MainLayout;
