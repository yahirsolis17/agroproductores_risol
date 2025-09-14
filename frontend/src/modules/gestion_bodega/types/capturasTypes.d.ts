export interface Recepcion {
  id: number;
  bodega: number;
  temporada: number;
  fecha: string;
  huertero_nombre?: string;
  tipo_mango: string;
  cajas_campo: number;
}

export interface ClasificacionEmpaque {
  id: number;
  recepcion: number;
  bodega: number;
  temporada: number;
  fecha: string;
  material: string;
  calidad: string;
  tipo_mango?: string;
  cantidad_cajas: number;
}

