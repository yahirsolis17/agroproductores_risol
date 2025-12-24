// src/modules/gestion_huerta/types/shared.ts
export type Estado = 'activos' | 'archivados' | 'todos';

import { PaginationMeta } from '../../../types/pagination';
export type { PaginationMeta };

export type Notification = {
  key: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: string;
  target?: string;
};

export type ListData<T, TMeta extends PaginationMeta = PaginationMeta> = {
  results: T[];
  meta: TMeta;
};

export type ApiEnvelope<TData> = {
  success: boolean;
  notification: Notification;
  data: TData;
};

export type ListEnvelope<T, TMeta extends PaginationMeta = PaginationMeta> = ApiEnvelope<ListData<T, TMeta>>;

export interface AffectedCounts {
  huertas?: number;
  huertas_rentadas?: number;
  temporadas: number;
  cosechas: number;
  inversiones: number;
  ventas: number;
}
