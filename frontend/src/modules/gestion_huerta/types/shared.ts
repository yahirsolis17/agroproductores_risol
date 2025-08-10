export type Estado = 'activos' | 'archivados' | 'todos';

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface AffectedCounts {
  huertas?: number;
  huertas_rentadas?: number;
  temporadas: number;
  cosechas: number;
  inversiones: number;
  ventas: number;
}
