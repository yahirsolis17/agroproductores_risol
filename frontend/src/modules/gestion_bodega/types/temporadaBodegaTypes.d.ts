// Tipos comunes del módulo de Bodega

// ==== Notificaciones ====
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationPayload {
  type: NotificationType;
  message: string;
  code?: number | string;
  key?: string;
}

// ==== Paginación (alineado a lo que usan tus otros módulos) ====
export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==== Estados de listados ====
export type EstadoListado = 'activas' | 'archivadas' | 'todas';

// ==== Bodega (por si lo usas aquí) ====
export interface Bodega {
  id: number;
  nombre: string;
  ubicacion?: string | null;
  is_active: boolean;
  archivado_en?: string | null;
  creado_en?: string;
  actualizado_en?: string;
}

// ==== Temporada de Bodega ====
export type EstadoTemporadaBodega = EstadoListado;

export interface TemporadaBodega {
  id: number;
  año: number;
  bodega_id: number;
  bodega_nombre?: string | null;
  bodega_ubicacion?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  finalizada: boolean;
  is_active: boolean;
  archivado_en?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  // serializer expone bodega_id y bodega_nombre para facilitar encabezados
}

export interface TemporadaBodegaCreateData {
  bodegaId: number;
  año: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

export interface TemporadaBodegaUpdateData {
  año?: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  finalizada?: boolean;
}
