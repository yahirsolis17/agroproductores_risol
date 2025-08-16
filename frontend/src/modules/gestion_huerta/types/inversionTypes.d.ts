/* ══════════════════════════════════════════════════════════════
   TYPES · Inversiones
   ══════════════════════════════════════════════════════════════ */

export interface InversionHuerta {
  id:               number;
  fecha:            string;        // YYYY-MM-DD (local)
  descripcion?:     string | null;

  // DRF DecimalField puede llegar como string → permitimos ambas
  gastos_insumos:   number | string;
  gastos_mano_obra: number | string;
  gastos_totales:   number | string;        // calculado

  categoria: number;               // FK
  cosecha:   number;               // FK
  temporada: number;               // FK
  huerta?:   number | null;        // FK (según origen)
  huerta_rentada?: number | null;  // FK (según origen)

  is_active:   boolean;
  archivado_en?: string | null;
}

/** Payload para crear (POST) — el service inyecta *_id faltantes vía contexto */
export interface InversionHuertaCreateData {
  fecha:            string;        // YYYY-MM-DD
  descripcion?:     string;
  gastos_insumos:   number;
  gastos_mano_obra: number;
  categoria:        number;        // FK
  cosecha:          number;        // (el form puede setearlo, pero el service usa el del contexto)
}

/** Payload para actualizar (PATCH) */
export interface InversionHuertaUpdateData extends Partial<InversionHuertaCreateData> {}

/* Aliases para no romper imports de formularios */
export type InversionCreateData = InversionHuertaCreateData;
export type InversionUpdateData = InversionHuertaUpdateData;
