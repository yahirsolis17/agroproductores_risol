// src/modules/gestion_huerta/types/shared.ts
export type Estado = 'activos' | 'archivados' | 'todos';

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;         // ← nuevo
  page_size: number;    // ← nuevo
  total_pages: number;  // ← nuevo
}

export interface AffectedCounts {
  huertas?: number;
  huertas_rentadas?: number;
  temporadas: number;
  cosechas: number;
  inversiones: number;
  ventas: number;
}
