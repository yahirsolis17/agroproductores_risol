/* Types for the Ventas (sales) module.
 *
 * These interfaces define the shape of the data returned from and sent to the
 * backend API.  A sale may belong to either a huerta (owned plot) or a huerta
 * rentada (rented plot), so both identifiers are present and optional.
 * The backend computes `total_venta` and `ganancia_neta`.
 */

export interface VentaHuerta {
  id: number;
  /** Fecha de la venta, formato YYYY-MM-DD */
  fecha_venta: string;
  /** Número de cajas vendidas */
  num_cajas: number;
  /** Precio por caja (entero, sin decimales) */
  precio_por_caja: number;
  /** Tipo de mango, libre */
  tipo_mango: string;
  /** Descripción opcional de la venta */
  descripcion?: string | null;
  /** Gasto asociado a la venta (entero, sin decimales) */
  gasto: number;

  /** Total de la venta, calculado por el backend */
  total_venta: number;
  /** Ganancia neta, calculada por el backend */
  ganancia_neta: number;

  /** Identificador de la cosecha */
  cosecha: number;
  /** Identificador de la temporada */
  temporada: number;
  /** Identificador de la huerta asociada, null cuando se usa huerta_rentada */
  huerta: number | null;
  /** Identificador de la huerta rentada asociada, null cuando se usa huerta */
  huerta_rentada: number | null;

  /** Indicador de si la venta está activa (no archivada) */
  is_active: boolean;
  /** Fecha de archivado, en caso de estar archivada */
  archivado_en?: string | null;
}

/** Datos permitidos para crear una venta.  El contexto (huertaId, temporadaId y cosechaId)
 * se envía por separado, de modo que aquí solo se indica la cosecha. */
export interface VentaCreateData {
  fecha_venta: string;
  num_cajas: number;
  precio_por_caja: number;
  tipo_mango: string;
  descripcion?: string;
  gasto: number;
  cosecha: number;
}

/** Datos permitidos para actualizar una venta.  Todos los campos son opcionales. */
export interface VentaUpdateData
  extends Partial<VentaCreateData> {}

/* Aliases para los formularios */
export type VentaCreateData = VentaCreateData;
export type VentaUpdateData = VentaUpdateData;

/** Filtros posibles para ventas en la interfaz.  El filtro `estado` (activas, archivadas,
 * todas) se maneja de manera independiente en el estado del slice/hook. */
export interface VentaFilters {
  tipoMango?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
