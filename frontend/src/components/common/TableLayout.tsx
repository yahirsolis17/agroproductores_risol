// src/components/common/TableLayout.tsx
import React from 'react';
import { Box, Pagination } from '@mui/material';

export interface Column<T> {
  label: string;
  key: keyof T;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface TableLayoutProps<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  columns: Column<T>[];
  renderActions?: (item: T, index: number) => React.ReactNode;
  onPageChange: (newPage: number) => void;
  /** Mensaje a mostrar cuando data.length === 0 */
  emptyMessage?: string;
}

export function TableLayout<T>({
  data,
  page,
  pageSize,
  count,
  columns,
  renderActions,
  onPageChange,
  emptyMessage = 'No hay datos.',
}: TableLayoutProps<T>) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <>
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
            {data.length ? (
              data.map((item, i) => (
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
