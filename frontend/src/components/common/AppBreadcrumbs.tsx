import React from 'react';
import { motion } from 'framer-motion';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import type { Crumb } from '../../global/store/breadcrumbsSlice';
import type { RootState } from '../../global/store/store';

const buildSearchSuffix = (currentSearch: string) => {
  const keep = new URLSearchParams(currentSearch);
  const whitelist = ['temporada', 'isoSemana', 'bodega', 'semana_id'];
  const qs = new URLSearchParams();

  whitelist.forEach((key) => {
    const value = keep.get(key);
    if (value) qs.set(key, value);
  });

  const tail = qs.toString();
  return tail ? `?${tail}` : '';
};

const AppBreadcrumbs: React.FC = () => {
  const crumbs = useSelector((state: RootState) => state.breadcrumbs.crumbs) as Crumb[];
  const location = useLocation();

  if (!crumbs.length) return null;

  return (
    <div className="mb-4 flex justify-center px-4">
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="inline-flex max-w-full flex-wrap items-center gap-y-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-sm"
        aria-label="breadcrumb"
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const hasQueryInPath = crumb.path?.includes('?');
          const to = !isLast
            ? (hasQueryInPath ? crumb.path : `${crumb.path}${buildSearchSuffix(location.search)}`)
            : '';

          return (
            <React.Fragment key={`${crumb.label}-${idx}`}>
              {!isLast ? (
                <RouterLink
                  to={to}
                  className="text-sm font-medium text-neutral-500 transition-colors hover:text-primary"
                >
                  {crumb.label}
                </RouterLink>
              ) : (
                <span className="text-sm font-semibold text-primary-dark" aria-current="page">
                  {crumb.label}
                </span>
              )}
              {idx < crumbs.length - 1 && (
                <span className="mx-3 text-xs text-neutral-300">/</span>
              )}
            </React.Fragment>
          );
        })}
      </motion.nav>
    </div>
  );
};

export default AppBreadcrumbs;
