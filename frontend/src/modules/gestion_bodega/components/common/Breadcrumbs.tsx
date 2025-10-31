// src/modules/gestion_bodega/components/common/Breadcrumbs.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import type { RootState } from '../../../../global/store/store';
import type { Crumb } from '../../../../global/store/breadcrumbsSlice';

function buildSearchSuffix(currentSearch: string) {
  // Preserva solo las llaves de contexto relevantes
  const keep = new URLSearchParams(currentSearch);
  const temporada = keep.get('temporada');
  const isoSemana = keep.get('isoSemana'); // FE key (backend usa iso_semana)
  const bodega = keep.get('bodega');

  const qs = new URLSearchParams();
  if (temporada) qs.set('temporada', temporada);
  if (isoSemana) qs.set('isoSemana', isoSemana);
  if (bodega) qs.set('bodega', bodega);

  const tail = qs.toString();
  return tail ? `?${tail}` : '';
}

const Breadcrumbs: React.FC = () => {
  // Toma los crumbs desde Redux (mismo patrón que en gestión_huerta)
  const crumbs: Crumb[] = useSelector((state: RootState) => state.breadcrumbs.crumbs);
  const location = useLocation();

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
          const hasQueryInPath = crumb.path?.includes('?');
          // Si el path YA trae query, respetamos tal cual; si no, le anexamos el contexto actual (temporada/isoSemana/bodega).
          const to = !isLast
            ? (hasQueryInPath ? crumb.path : `${crumb.path}${buildSearchSuffix(location.search)}`)
            : '';

          return (
            <React.Fragment key={idx}>
              {!isLast ? (
                <RouterLink
                  to={to}
                  className="text-secondary-DEFAULT hover:text-secondary-light transition-colors duration-200 font-medium text-sm"
                >
                  {crumb.label}
                </RouterLink>
              ) : (
                <span className="text-primary-DEFAULT font-semibold text-sm" aria-current="page">
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
