// src/modules/gestion_huerta/components/common/Breadcrumbs.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../global/store/store';
import { Crumb } from '../../../../global/store/breadcrumbsSlice';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const Breadcrumbs: React.FC = () => {
  // Tomamos la lista de crumbs desde Redux
  const crumbs: Crumb[] = useSelector((state: RootState) => state.breadcrumbs.crumbs);

  if (!crumbs || crumbs.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-center px-4">
      <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="inline-flex items-center bg-neutral-50 rounded-xl shadow-soft px-6 py-3 mt-4"
      aria-label="breadcrumb"
      >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
        <React.Fragment key={idx}>
          {!isLast ? (
          <RouterLink
            to={crumb.path}
            className="text-secondary-DEFAULT hover:text-secondary-light transition-colors duration-200 font-medium text-sm"
          >
            {crumb.label}
          </RouterLink>
          ) : (
          <span className="text-primary-DEFAULT font-semibold text-sm">
            {crumb.label}
          </span>
          )}
          {idx < crumbs.length - 1 && (
          <span className="mx-3 text-primary-light">/</span>
          )}
        </React.Fragment>
        );
      })}
      </motion.nav>
    </div>
  );
};

export default Breadcrumbs;
