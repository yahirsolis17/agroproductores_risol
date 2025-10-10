// src/modules/gestion_bodega/types/bodegaTypes.d.ts

/** Vista por pestañas en la UI y filtro servidor. */
export type EstadoBodega = 'activos' | 'archivados' | 'todos';

/** Entidad principal (serializer de backend). */
export interface Bodega {
  id: number;
  nombre: string;
  ubicacion: string;
  is_active: boolean;
  archivado_en?: string | null;

  creado_en?: string;      // ISO datetime
  actualizado_en?: string; // ISO datetime
}

/** Payloads CRUD */
export interface BodegaCreateData {
  nombre: string;
  ubicacion?: string;
}

export interface BodegaUpdateData {
  nombre?: string;
  ubicacion?: string;
}

/** Filtros del listado (mirror de query params en ViewSet). */
export interface BodegaFilters {
  search?: string;
  nombre?: string;
  ubicacion?: string;
}

/** Paginación homogénea (igual que huerta). */
export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Data de list: lo que realmente consume la UI. */
export interface ListBodegasData {
  bodegas: Bodega[];
  meta: PaginationMeta;
}

/** Alias por compatibilidad con otros módulos. */
export interface ListBodegasResult extends ListBodegasData {}

/** Notificaciones backend (NotificationMixin). */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export interface NotificationPayload {
  key?: string;               // clave semántica (para i18n/toast engine)
  message: string;            // texto directo
  type: NotificationType;     // severidad
  code?: number | string;
}

/** Envelope genérico (igual patrón que en gestión_huerta). */
export interface ApiEnvelope<TData = unknown> {
  success: boolean;
  notification: NotificationPayload;
  data: TData;
}

/** Respuestas del service (fuertemente tipadas). */
export type CreateBodegaResponse    = ApiEnvelope<{ bodega: Bodega }>;
export type UpdateBodegaResponse    = ApiEnvelope<{ bodega: Bodega }>;
export type DeleteBodegaResponse    = ApiEnvelope<{ deleted_id: number }>;
export type ArchivarBodegaResponse  = ApiEnvelope<{ bodega_id: number; affected?: Record<string, number> }>;
export type RestaurarBodegaResponse = ApiEnvelope<{ bodega_id: number; affected?: Record<string, number> }>;

/** Helpers de consumo (por si deseas reexportar y mantener consistencia) */
export type { Bodega as TBodega };
export type { ListBodegasData as TBodegaListData };
