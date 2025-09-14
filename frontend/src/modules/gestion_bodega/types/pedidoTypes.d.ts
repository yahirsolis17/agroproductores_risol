export interface PedidoRenglon {
  id: number;
  pedido: number;
  material: string;
  calidad: string;
  tipo_mango?: string;
  cantidad_solicitada: number;
  cantidad_surtida: number;
}

export interface Pedido {
  id: number;
  bodega: number;
  temporada: number;
  cliente: number;
  fecha: string;
  estado: string;
  observaciones?: string;
  renglones?: PedidoRenglon[];
}

