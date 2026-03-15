// modules/gestion_bodega/types/shared.ts

/* -----------------------------------------------------------------------------
 * Tipos y enums compartidos para el módulo Gestión Bodega
 * Alineado con el estilo de modules/gestion_huerta/types/shared.ts
 * -------------------------------------------------------------------------- */

/** Material del empaque */
export enum Material {
  MADERA = 'MADERA',
  PLASTICO = 'PLASTICO',
}

/** Calidades para madera */
export enum CalidadMadera {
  EXTRA   = 'EXTRA',
  PRIMERA = 'PRIMERA',
  SEGUNDA = 'SEGUNDA',
  TERCERA = 'TERCERA',
  CUARTA  = 'CUARTA',
  NINIO   = 'NINIO',
  MADURO  = 'MADURO',
  RONIA   = 'RONIA',
}

/** Estado del camión de salida (embarque) */
export enum EstadoCamion {
  BORRADOR   = 'BORRADOR',
  CONFIRMADO = 'CONFIRMADO',
  ANULADO    = 'ANULADO',
}

/** Clave ISO de semana: "2025-W36" */
export type IsoWeekKey = string;

/** Contexto de semana ISO (útil para filtros en listados/reportes) */
export interface IsoWeekContext {
  bodega_id: number;
  temporada_id: number;
  iso_week: IsoWeekKey;  // p.ej. "2025-W36"
  desde: string;         // "YYYY-MM-DD"
  hasta: string;         // "YYYY-MM-DD"
}

/** Paginación DRF estándar */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Meta de paginación estándar */
import { PaginationMeta } from "../../../types/pagination";
export type { PaginationMeta };

/** Error genérico de API */
export type ApiError =
  | { detail?: string; [key: string]: any }
  | string;

/** OK envelope simple cuando el backend devuelve mensajes */
export interface ApiOk {
  ok: true;
  message?: string;
}

/** Utilidad para mapear calidades por material en formularios */
export type CalidadesPorMaterial = {
  [Material.MADERA]: Array<keyof typeof CalidadMadera>;
};
