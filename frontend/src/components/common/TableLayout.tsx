// src/components/common/TableLayout.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Pagination,
  TextField,
  MenuItem,
  Autocomplete,
  Skeleton,
  CircularProgress,
} from '@mui/material';

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
  <div className="overflow-x-auto rounded-xl shadow">
    <table className="min-w-full bg-white rounded-xl animate-fade-in">
      <thead>
        <tr className="bg-neutral-100">
          <th className="px-4 py-2 border">
            <Skeleton variant="text" width={20} />
          </th>
          {columns.map((_, i) => (
            <th key={i} className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}>
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
              <td key={j} className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}>
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
              <td className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}>
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
  useEffect(() => {
    if (filterValues) setFilters(filterValues);
  }, [filterValues]);

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

  const handleFilterUpdate = (k: string, v: any) => {
    const next = { ...filters, [k]: v };
    setFilters(next);
    onFilterChange?.(next);
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
        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          {filterConfig.map((cfg) => {
            // Extraemos solo las props que debe recibir el componente, sin `key`
            const commonProps = {
              label: cfg.label,
              size: 'small' as const,
              sx: { minWidth: cfg.width ?? 160 },
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
      <div className="overflow-x-auto rounded-xl shadow">
        <table className="min-w-full bg-white rounded-xl">
          <thead>
            <tr className="bg-neutral-100 text-sm text-neutral-700">
              <th className="px-4 py-2 border">#</th>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
                  style={{ textAlign: c.align || 'left' }}
                >
                  {c.label}
                </th>
              ))}
              {renderActions && (
                <th
                  className={`px-4 ${dense ? 'py-1' : 'py-2'} border text-center`}
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
                    className={`text-sm transition-colors ${striped
                      ? i % 2
                        ? 'bg-neutral-50'
                        : 'bg-white'
                      : ''
                      } ${onRowClick
                        ? 'cursor-pointer hover:bg-neutral-100'
                        : 'hover:bg-neutral-50'
                      }`}
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className="px-4 border">
                      {(page - 1) * effectivePageSize + i + 1}
                    </td>
                    {columns.map((col, j) => (
                      <td
                        key={j}
                        className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(item, i) : String(item[col.key])}
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
                  className="py-4 text-center text-neutral-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
        />
      </Box>
    </div>
  );
}
