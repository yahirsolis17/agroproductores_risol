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
  render?: (item: T) => React.ReactNode;
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
  pageSize: number;
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

  /* Precarga de opción */
  useEffect(() => {
    filterConfig.forEach((cfg) => {
      if (cfg.type !== 'autocomplete-async') return;
      const current = filters[cfg.key];
      if (!current) return;
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
  }, [filters, filterConfig, asyncOptions]);

  const showSkeleton = useDelayedLoading(loading);
  const totalPages = Math.max(
    1,
    serverSidePagination
      ? Math.ceil(count / pageSize)
      : Math.ceil(
          (applyFiltersInternally ? data.length : count) / pageSize,
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
            const common = {
              key: cfg.key,
              label: cfg.label,
              size: 'small' as const,
              sx: { minWidth: cfg.width ?? 160 },
            };

            switch (cfg.type) {
              case 'text':
                return (
                  <TextField
                    {...common}
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) =>
                      handleFilterUpdate(cfg.key, e.target.value)
                    }
                  />
                );

              case 'select':
                return (
                  <TextField
                    {...common}
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
                    {...common}
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
                    renderInput={(p) => <TextField {...p} label={cfg.label} />}
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
                    {...common}
                    options={asyncOptions}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(
                      o: FilterOption,
                      v: FilterOption,
                    ) => o.value === v.value}
                    filterOptions={(x) => x}
                    loading={asyncLoading}
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
                    renderInput={(p) => (
                      <TextField
                        {...p}
                        label={cfg.label}
                        placeholder="Empieza a escribir..."
                        InputProps={{
                          ...p.InputProps,
                          endAdornment: (
                            <>
                              {asyncLoading && (
                                <CircularProgress size={20} />
                              )}
                              {p.InputProps.endAdornment}
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
                const key = rowKey
                  ? rowKey(item)
                  : i + (page - 1) * pageSize;
                return (
                  <tr
                    key={key}
                    className={`text-sm transition-colors ${
                      striped
                        ? i % 2
                          ? 'bg-neutral-50'
                          : 'bg-white'
                        : ''
                    } ${
                      onRowClick
                        ? 'cursor-pointer hover:bg-neutral-100'
                        : 'hover:bg-neutral-50'
                    }`}
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className="px-4 border">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    {columns.map((col, j) => (
                      <td
                        key={j}
                        className={`px-4 ${dense ? 'py-1' : 'py-2'} border`}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render
                          ? col.render(item)
                          : String(item[col.key])}
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
