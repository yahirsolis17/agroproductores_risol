export interface InventarioPlastico {
  id: number;
  bodega: number;
  temporada: number;
  cliente?: number | null;
  calidad: string;
  tipo_mango?: string;
  stock: number;
}

export interface MovimientoPlastico {
  id: number;
  inventario: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  motivo?: string;
  fecha: string;
}

