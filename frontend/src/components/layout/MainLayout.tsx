import React from 'react';
import { Outlet } from 'react-router-dom';

import AppBreadcrumbs from '../common/AppBreadcrumbs';
import Footer from './Footer';
import Navbar from './Navbar';

const MainLayout: React.FC = () => (
  <div className="app-shell flex min-h-screen flex-col">
    <Navbar />
    <div role="main" className="app-main">
      <div className="app-main-inner">
        <AppBreadcrumbs />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default MainLayout;
