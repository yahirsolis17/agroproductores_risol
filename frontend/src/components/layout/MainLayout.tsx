// src/components/layout/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Breadcrumbs from '../../../src/modules/gestion_huerta/components/common/Breadcrumbs'; // ← importar el componente

const MainLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />

    {/*
      role="main" → landmark para lectores de pantalla
      Insertamos Breadcrumbs justo antes de <Outlet /> para que
      se muestre en todas las rutas anidadas.
    */}
    <div role="main" className="flex-grow px-4 py-6">
      <Breadcrumbs />
      <Outlet />
    </div>

    <Footer />
  </div>
);

export default MainLayout;
