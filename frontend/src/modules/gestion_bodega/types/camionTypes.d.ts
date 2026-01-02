export interface CamionItem {
  id: number;
  camion: number;
  material: string;
  calidad: string;
  tipo_mango?: string;
  cantidad_cajas: number;
}

export interface CamionSalida {
  id: number;
  bodega: number;
  temporada: number;
  numero?: number;
  folio?: string;
  estado: string;
  fecha_salida: string;
  placas?: string;
  chofer?: string;
  destino?: string;
  receptor?: string;
  observaciones?: string;
  items?: CamionItem[];
}

