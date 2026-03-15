export interface CompraMadera {
  id: number;
  bodega: number;
  temporada: number;
  proveedor_nombre: string;
  cantidad_cajas: string;
  precio_unitario: string;
  monto_total: string;
  saldo: string;
  stock_inicial?: string;
  stock_actual?: string;
  hay_stock?: boolean;
}

export interface AbonoMadera {
  id: number;
  compra: number;
  fecha: string;
  monto: string;
  metodo?: string;
  saldo_resultante: string;
}

export interface Consumible {
  id: number;
  bodega: number;
  temporada: number;
  concepto: string;
  cantidad: number;
  costo_unitario: string;
  total: string;
  fecha: string;
  observaciones?: string;
}

