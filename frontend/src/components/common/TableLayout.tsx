// src/components/common/TableLayout.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Pagination,
  TextField,
  MenuItem,
  Autocomplete,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import useDebouncedValue from '../../global/hooks/useDebouncedValue';

/* ──────────── Tipos genéricos de columnas ──────────── */
export interface Column<T> {
  label: string;
  key: keyof T;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

/* ──────────── Config de filtros ──────────── */
export type FilterType =
  | 'text'
  | 'select'
  | 'autocomplete'
  | 'autocomplete-async';

export interface FilterOption {
  label: string;
  value: any;
  firstLetter?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  width?: number | string;
  loadOptions?: (inputValue: string) => Promise<FilterOption[]>;
}

/* ──────────── Props del componente ──────────── */
export interface TableLayoutProps<T> {
  data: T[];
  page: number;
  pageSize?: number;
  count: number;
  columns: Column<T>[];
  onPageChange: (newPage: number) => void;
  renderActions?: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  serverSidePagination?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  striped?: boolean;
  dense?: boolean;
  filterConfig?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  applyFiltersInternally?: boolean;
  rowKey?: (row: T) => string | number;
  onRowClick?: (item: T) => void;
  filterValues?: Record<string, any>;
  extraFilterElement?: React.ReactNode;
  metaPageSize?: number | null;
}

/* ──────────── Hook: skeleton retardado ──────────── */
const useDelayedLoading = (isLoading: boolean, delay = 200) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let id: number;
    if (isLoading && !show) id = window.setTimeout(() => setShow(true), delay);
    if (!isLoading) setShow(false);
    return () => clearTimeout(id);
  }, [isLoading, show, delay]);
  return show;
};

/* ──────────── Skeleton de tabla ──────────── */
interface TableSkeletonProps {
  columns: Column<any>[];
  skeletonRows: number;
  dense: boolean;
  hasActions: boolean;
}
const TableSkeleton = ({
  columns,
  skeletonRows,
  dense,
  hasActions,
}: TableSkeletonProps) => (
  <div className="app-table-shell animate-fade-in">
    <table className="app-table-grid">
      <thead>
        <tr>
          <th className="px-4 py-3 text-left">
            <Skeleton variant="text" width={20} />
          </th>
          {columns.map((_, i) => (
            <th key={i} className={`px-4 ${dense ? 'py-2' : 'py-3'} text-left`}>
              <Skeleton variant="text" width={100} />
            </th>
          ))}
          {hasActions && (
            <th className={`px-4 ${dense ? 'py-2' : 'py-3'} text-center`}>
              <Skeleton variant="text" width={60} />
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <tr key={i} className="app-table-row">
            <td className="px-4 py-3">
              <Skeleton variant="text" width={20} />
            </td>
            {columns.map((col, j) => (
              <td key={j} className={`px-4 ${dense ? 'py-2' : 'py-3'}`}>
                <Skeleton
                  variant="text"
                  width={
                    col.align === 'right'
                      ? 60
                      : col.align === 'center'
                        ? 80
                        : '100%'
                  }
                />
              </td>
            ))}
            {hasActions && (
              <td className={`px-4 ${dense ? 'py-2' : 'py-3'}`}>
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

/* ──────────── Componente principal ──────────── */
export function TableLayout<T>({
  data,
  page,
  pageSize,
  metaPageSize,
  count,
  columns,
  onPageChange,
  renderActions,
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
  /* ---------- filtros ---------- */
  const [filters, setFilters] = useState(filterValues || {});
  const isSyncingFiltersRef = useRef(false);

  useEffect(() => {
    if (!filterValues) return;
    isSyncingFiltersRef.current = true;
    setFilters(filterValues);
  }, [filterValues]);
  const debouncedFilters = useDebouncedValue(filters, 180);

  /* ---------- estado async ---------- */
  const [asyncInput, setAsyncInput] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<FilterOption[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);

  /* Precarga de opción (sólo si hay id y el usuario ya escribió algo) */
  useEffect(() => {
    filterConfig.forEach((cfg) => {
      if (cfg.type !== 'autocomplete-async') return;
      const current = filters[cfg.key];
      if (!current || asyncInput.trim() === '') return;
      if (asyncOptions.some((o) => o.value === current)) return;

      setAsyncLoading(true);
      cfg
        .loadOptions!(String(current))
        .then((opts) => {
          const found = opts.find((o) => o.value === current);
          if (found) setAsyncOptions((prev) => [...prev, found]);
        })
        .finally(() => setAsyncLoading(false));
    });
  }, [filters, filterConfig, asyncOptions, asyncInput]);

  const showSkeleton = useDelayedLoading(loading && data.length === 0);
  const effectivePageSize = Math.max(1, metaPageSize ?? pageSize ?? 10);
  const totalPages = Math.max(
    1,
    serverSidePagination
      ? Math.ceil(count / effectivePageSize)
      : Math.ceil(
        (applyFiltersInternally ? data.length : count) / effectivePageSize,
      ),
  );

  useEffect(() => {
    if (!onFilterChange) return;
    if (isSyncingFiltersRef.current) {
      isSyncingFiltersRef.current = false;
      return;
    }
    onFilterChange(debouncedFilters);
  }, [debouncedFilters, onFilterChange]);

  const handleFilterUpdate = (k: string, v: any) => {
    setFilters((prev) => ({ ...prev, [k]: v }));
  };

  if (showSkeleton)
    return (
      <TableSkeleton
        columns={columns}
        skeletonRows={skeletonRows}
        dense={dense}
        hasActions={!!renderActions}
      />
    );

  /* ---------- Render ---------- */
  return (
    <div className="animate-fade-in">
      {/* Filtros */}
      {filterConfig.length > 0 && (
        <Box className="app-table-toolbar" display="flex" flexWrap="wrap" gap={2} mb={3}>
          {filterConfig.map((cfg) => {
            // Extraemos solo las props que debe recibir el componente, sin `key`
            const commonProps = {
              label: cfg.label,
              size: 'small' as const,
              sx: { minWidth: cfg.width ?? 180 },
            };

            switch (cfg.type) {
              case 'text':
                return (
                  <TextField
                    key={cfg.key}
                    {...commonProps}
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) =>
                      handleFilterUpdate(cfg.key, e.target.value)
                    }
                  />
                );

              case 'select':
                return (
                  <TextField
                    key={cfg.key}
                    {...commonProps}
                    select
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) =>
                      handleFilterUpdate(cfg.key, e.target.value)
                    }
                  >
                    {cfg.options?.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                );

              case 'autocomplete':
                return (
                  <Autocomplete
                    key={cfg.key}
                    {...commonProps}
                    options={cfg.options ?? []}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(o, v) => o.value === v.value}
                    value={
                      (cfg.options ?? []).find(
                        (o) => o.value === filters[cfg.key],
                      ) || null
                    }
                    onChange={(_, v) =>
                      handleFilterUpdate(cfg.key, v?.value ?? null)
                    }
                    renderInput={(params) => (
                      <TextField {...params} label={cfg.label} />
                    )}
                  />
                );

              case 'autocomplete-async': {
                const handleAsyncInput = async (v: string) => {
                  setAsyncInput(v);
                  if (v.trim().length < 2) return;
                  setAsyncLoading(true);
                  const opts = await cfg.loadOptions!(v);
                  setAsyncOptions(opts);
                  setAsyncLoading(false);
                };

                return (
                  <Autocomplete
                    key={cfg.key}
                    {...commonProps}
                    options={asyncOptions}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(o: FilterOption, v: FilterOption) =>
                      o.value === v.value
                    }
                    filterOptions={(opts, state) =>
                      state.inputValue.trim() === '' ? [] : opts
                    }
                    loading={asyncLoading}
                    openOnFocus={false}
                    value={
                      asyncOptions.find(
                        (o) => o.value === filters[cfg.key],
                      ) || null
                    }
                    onInputChange={(_, v, reason) => {
                      if (reason === 'input') handleAsyncInput(v);
                    }}
                    onChange={(_, v) =>
                      handleFilterUpdate(cfg.key, v?.value ?? null)
                    }
                    noOptionsText={
                      asyncLoading
                        ? 'Buscando…'
                        : asyncInput.length < 2
                          ? 'Empieza a escribir...'
                          : 'No se encontraron coincidencias'
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={cfg.label}
                        placeholder="Empieza a escribir..."
                        autoComplete="off"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {asyncLoading && (
                                <CircularProgress size={20} />
                              )}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                );
              }

              default:
                return null;
            }
          })}
          {extraFilterElement}
        </Box>
      )}

      {/* Tabla */}
      <div className="app-table-shell">
        <div className="overflow-x-auto">
        <table className="app-table-grid min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-4 ${dense ? 'py-2' : 'py-3'}`}
                  style={{ textAlign: c.align || 'left' }}
                >
                  {c.label}
                </th>
              ))}
              {renderActions && (
                <th
                  className={`px-4 ${dense ? 'py-2' : 'py-3'} text-center`}
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((item, i) => {
                const key = rowKey ? rowKey(item) : i + (page - 1) * effectivePageSize;
                return (
                  <tr
                    key={key}
                    className={`app-table-row text-sm ${striped
                      ? i % 2
                        ? 'bg-white/70'
                        : 'bg-white'
                      : ''
                      } ${onRowClick
                        ? 'app-table-row--clickable'
                        : ''
                      }`}
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className={`px-4 ${dense ? 'py-2' : 'py-3'} font-medium text-slate-500`}>
                      {count - (page - 1) * effectivePageSize - i}
                    </td>
                    {columns.map((col, j) => (
                      <td
                        key={j}
                        className={`px-4 ${dense ? 'py-2' : 'py-3'} text-slate-700`}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(item, i) : String(item[col.key])}
                      </td>
                    ))}
                    {renderActions && (
                      <td className={`px-4 ${dense ? 'py-2' : 'py-3'} align-middle`}>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          width="100%"
                          minHeight={dense ? 28 : 36}
                        >
                          {renderActions(item, i)}
                        </Box>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={1 + columns.length + (renderActions ? 1 : 0)}
                  className="app-table-empty"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Paginación */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, n) => onPageChange(n)}
          variant="outlined"
          shape="rounded"
          color="primary"
          size="large"
        />
      </Box>
    </div>
  );
}
