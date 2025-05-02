import React, { useMemo, useState } from 'react';
import {
  Box,
  Pagination,
  TextField,
  MenuItem,
  Autocomplete,
} from '@mui/material';

/* ──────────────────────────────────────────────────────────────
 *  Genéricos de columnas (sin cambios)
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
  key:       string;          // Nombre de campo o identificador
  label:     string;          // Label que se muestra al usuario
  type:      FilterType;      // Tipo de filtro
  options?:  FilterOption[];  // Requerido para select / autocomplete
  width?:    number | string; // Tamaño opcional del campo
}

/* ──────────────────────────────────────────────────────────────
 *  Props del componente
 * ────────────────────────────────────────────────────────────── */
interface TableLayoutProps<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  columns: Column<T>[];
  renderActions?: (item: T, index: number) => React.ReactNode;
  onPageChange: (newPage: number) => void;
  emptyMessage?: string;

  /* 🔥 NUEVO: Filtros genéricos */
  filterConfig?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  /** Si true, la tabla filtra `data` internamente */
  applyFiltersInternally?: boolean;
}

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
  filterConfig = [],
  onFilterChange,
  applyFiltersInternally = false,
}: TableLayoutProps<T>) {
  /* ------------------------ estado filtros ------------------------ */
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleFilterUpdate = (key: string, value: any) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange?.(next);
  };

  /* -------------------- aplicar filtros internos ------------------ */
  const filteredData = useMemo(() => {
    if (!applyFiltersInternally || !filterConfig.length) return data;

    return data.filter((row: any) =>
      filterConfig.every((cfg) => {
        const v = filters[cfg.key];
        if (v === undefined || v === null || v === '') return true; // filtro vacío

        const rowVal = row[cfg.key];

        if (cfg.type === 'text') {
          return String(rowVal ?? '')
            .toLowerCase()
            .includes(String(v).toLowerCase());
        }
        // select o autocomplete → igualdad estricta
        return rowVal === v;
      })
    );
  }, [data, filters, filterConfig, applyFiltersInternally]);

  /* -------------- paginación sobre el data filtrado -------------- */
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      applyFiltersInternally ? filteredData.length / pageSize : count / pageSize
    )
  );

  /* -------------------------- render UI -------------------------- */
  return (
    <>
      {/* Bloque de filtros dinámicos */}
      {filterConfig.length > 0 && (
        <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
          {filterConfig.map((cfg) => {
            const sxWidth = { minWidth: cfg.width ?? 160 };

            switch (cfg.type) {
              case 'text':
                return (
                  <TextField
                    key={cfg.key}
                    label={cfg.label}
                    size="small"
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) => handleFilterUpdate(cfg.key, e.target.value)}
                    sx={sxWidth}
                  />
                );

              case 'select':
                return (
                  <TextField
                    key={cfg.key}
                    select
                    label={cfg.label}
                    size="small"
                    value={filters[cfg.key] ?? ''}
                    onChange={(e) => handleFilterUpdate(cfg.key, e.target.value)}
                    sx={sxWidth}
                  >
                    <MenuItem value="">Todos</MenuItem>
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
                    key={cfg.key}
                    options={cfg.options ?? []}
                    getOptionLabel={(o) => o.label}
                    size="small"
                    value={
                      cfg.options?.find((o) => o.value === filters[cfg.key]) ||
                      null
                    }
                    onChange={(_, val) =>
                      handleFilterUpdate(cfg.key, val?.value ?? null)
                    }
                    sx={sxWidth}
                    renderInput={(params) => (
                      <TextField {...params} label={cfg.label} />
                    )}
                    isOptionEqualToValue={(o, v) => o.value === v.value}
                  />
                );

              default:
                return null;
            }
          })}
        </Box>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl shadow">
        <table className="min-w-full bg-white rounded-xl">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700 text-sm">
              <th className="px-4 py-2 border">#</th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-4 py-2 border"
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="px-4 py-2 border text-center">Acciones</th>
              )}
            </tr>
          </thead>

          <tbody>
            {pageData.length ? (
              pageData.map((item, i) => (
                <tr
                  key={i}
                  className="text-center text-sm hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-4 py-2 border">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className="px-4 py-2 border"
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? '')}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-4 py-2 border">
                      {renderActions(item, i)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={
                    1 + columns.length + (renderActions ? 1 : 0)
                  }
                  className="text-center py-4 text-neutral-400"
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
    </>
  );
}
