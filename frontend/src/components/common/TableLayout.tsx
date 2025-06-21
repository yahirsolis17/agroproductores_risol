// src/components/common/TableLayout.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Pagination,
  TextField,
  MenuItem,
  Autocomplete,
  Skeleton,
} from '@mui/material';

/* ──────────────────────────────────────────────────────────────
 *  Genéricos de columnas
 * ────────────────────────────────────────────────────────────── */
export interface Column<T> {
  label:  string;
  key:    keyof T;
  render?: (item: T) => React.ReactNode;
  align?:  'left' | 'center' | 'right';
}

/* ──────────────────────────────────────────────────────────────
 *  Config genérica de filtros
 * ────────────────────────────────────────────────────────────── */
export type FilterType = 'text' | 'select' | 'autocomplete';

export interface FilterOption {
  label: string;
  value: any;
}

export interface FilterConfig {
  key:       string;
  label:     string;
  type:      FilterType;
  options?:  FilterOption[];
  width?:    number | string;
}

/* ──────────────────────────────────────────────────────────────
 *  Props del componente
 * ────────────────────────────────────────────────────────────── */
export interface TableLayoutProps<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  columns: Column<T>[];
  renderActions?: (item: T, index: number) => React.ReactNode;
  onPageChange: (newPage: number) => void;
  emptyMessage?: string;
  serverSidePagination?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  skeletonHeight?: number;
  striped?: boolean;
  dense?: boolean;
  filterConfig?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  applyFiltersInternally?: boolean;
  rowKey?: (row: T) => string | number;
  onRowClick?: (item: T) => void;
  // NUEVO: valores controlados de los filtros
  filterValues?: Record<string, any>;
  // NUEVO: permite renderizar un elemento extra junto a los filtros
  extraFilterElement?: React.ReactNode;
}

/* ──────────────────────────────────────────────────────────────
 *  Hooks personalizados
 * ────────────────────────────────────────────────────────────── */
const useDelayedLoading = (isLoading: boolean, delay = 200) => {
  const [showSkeleton, setShowSkeleton] = useState(false);
  
  useEffect(() => {
    let timeoutId: number;
    
    if (isLoading && !showSkeleton) {
      timeoutId = window.setTimeout(() => {
        setShowSkeleton(true);
      }, delay);
    } else if (!isLoading && showSkeleton) {
      setShowSkeleton(false);
    }
    
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLoading, showSkeleton, delay]);
  
  return showSkeleton;
};

/* ──────────────────────────────────────────────────────────────
 *  Componentes internos
 * ────────────────────────────────────────────────────────────── */
interface TableSkeletonProps {
  columns: Column<any>[];
  skeletonRows: number;
  dense: boolean;
  hasActions: boolean;
}

const TableSkeleton = ({ columns, skeletonRows, dense, hasActions }: TableSkeletonProps) => (
  <div className="overflow-x-auto rounded-xl shadow">
    <table className="min-w-full bg-white rounded-xl animate-fade-in">
      <thead>
        <tr className="bg-neutral-100">
          <th className="px-4 py-2 border">
            <Skeleton variant="text" width={20} />
          </th>
          {columns.map((_, i) => (
            <th
              key={i}
              className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
            >
              <Skeleton variant="text" width={100} />
            </th>
          ))}
          {hasActions && (
            <th className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}>
              <Skeleton variant="text" width={60} />
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <tr key={i}>
            <td className="px-4 border">
              <Skeleton variant="text" width={20} />
            </td>
            {columns.map((col, j) => (
              <td
                key={j}
                className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
              >
                <Skeleton 
                  variant="text"
                  width={col.align === 'right' ? 60 : col.align === 'center' ? 80 : '100%'} 
                />
              </td>
            ))}
            {hasActions && (
              <td className={`px-4 ${dense ? 'py-1' : 'py-2'} border text-center`}>
                <Box display="flex" gap={1} justifyContent="center">
                  <Skeleton variant="circular" width={24} height={24} />
                  <Skeleton variant="circular" width={24} height={24} />
                </Box>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ──────────────────────────────────────────────────────────────
 *  Componente principal
 * ────────────────────────────────────────────────────────────── */
export function TableLayout<T>({
  data,
  page,
  pageSize,
  count,
  columns,
  renderActions,
  onPageChange,
  emptyMessage = 'No hay datos.',
  loading = false,
  skeletonRows = 6,
  striped = false,
  dense = false,
  filterConfig = [],
  onFilterChange,
  applyFiltersInternally = false,
  rowKey,
  serverSidePagination = false,
  onRowClick,
  filterValues,
  extraFilterElement,
}: TableLayoutProps<T>) {
  // Si recibimos filterValues, sincronizamos el estado interno
  const [filters, setFilters] = useState<Record<string, any>>(filterValues || {});
  useEffect(() => {
    if (filterValues) setFilters(filterValues);
  }, [filterValues]);

  const showSkeleton = useDelayedLoading(loading);

  const handleFilterUpdate = (key: string, value: any) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange?.(next);
  };

  // Elimino cualquier filtrado local, la paginación y los filtros se manejan 100% desde el backend
  // El componente solo muestra los datos recibidos por props
  const pageData = data;     // No paginación local

  // Para serverSide: usamos count total; si no, igual que antes
  const totalPages = Math.max(
    1,
    serverSidePagination
      ? Math.ceil(count / pageSize)
      : Math.ceil(
          (applyFiltersInternally
            ? data.length
            : count) / pageSize
        )
  );

  if (showSkeleton) {
    return (
      <TableSkeleton
        columns={columns}
        skeletonRows={skeletonRows}
        dense={dense}
        hasActions={!!renderActions}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ——— Filtros dinámicos ——— */}
      {filterConfig.length > 0 && (
        <Box display="flex" gap={2} flexWrap="wrap" mb={3} alignItems="center">
          {filterConfig.map((cfg) => {
            const props = {
              key: cfg.key,
              label: cfg.label,
              size: 'small' as const,
              sx: { minWidth: cfg.width ?? 160 }
            };

            switch (cfg.type) {
              case 'text':
                return (
                  <TextField
                    {...props}
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) => handleFilterUpdate(cfg.key, e.target.value)}
                  />
                );
              case 'select':
                return (
                  <TextField
                    {...props}
                    select
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) => handleFilterUpdate(cfg.key, e.target.value)}
                  >
                    {cfg.options?.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              case 'autocomplete':
                return (
                  <Autocomplete
                    {...props}
                    options={cfg.options ?? []}
                    getOptionLabel={(o) => o.label}
                    value={cfg.options?.find((o) => o.value === filters[cfg.key]) || null}
                    onChange={(_, val) => handleFilterUpdate(cfg.key, val?.value ?? null)}
                    renderInput={(params) => <TextField {...params} label={cfg.label} />}
                    isOptionEqualToValue={(o, v) => o.value === v.value}
                  />
                );
              default:
                return null;
            }
          })}
          {/* Botón u otro elemento extra al final de los filtros */}
          {extraFilterElement}
        </Box>
      )}

      {/* ——— Tabla ——— */}
      <div className="overflow-x-auto rounded-xl shadow">
        <table className="min-w-full bg-white rounded-xl">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700 text-sm">
              <th className="px-4 py-2 border">#</th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className={`px-4 ${dense ? 'py-1' : 'py-2'} border text-center`}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageData.length > 0 ? (
              pageData.map((item, i) => {
                const key = rowKey ? rowKey(item) : (i + (page - 1) * pageSize);
                return (
                  <tr
                    key={key}
                    className={`text-sm transition-colors ${
                      striped
                        ? i % 2 === 0
                          ? 'bg-white'
                          : 'bg-neutral-50'
                        : ''
                    } ${onRowClick ? 'cursor-pointer hover:bg-neutral-100' : 'hover:bg-neutral-50'}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className="px-4 border">{(page - 1) * pageSize + i + 1}</td>
                    {columns.map((col, j) => (
                      <td
                        key={j}
                        className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(item) : String(item[col.key] ?? '')}
                      </td>
                    ))}
                    {renderActions && (
                      <td className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}>
                        {renderActions(item, i)}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={1 + columns.length + (renderActions ? 1 : 0)}
                  className="text-center py-4 text-neutral-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ——— Paginación ——— */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, n) => onPageChange(n)}
          variant="outlined"
          shape="rounded"
          color="primary"
        />
      </Box>
    </div>
  );
}
