// src/modules/gestion_huerta/types/shared.ts
export type Estado = 'activos' | 'archivados' | 'todos';

import { PaginationMeta } from '../../../types/pagination';
export type { PaginationMeta };

export interface AffectedCounts {
  huertas?: number;
  huertas_rentadas?: number;
  temporadas: number;
  cosechas: number;
  inversiones: number;
  ventas: number;
}
