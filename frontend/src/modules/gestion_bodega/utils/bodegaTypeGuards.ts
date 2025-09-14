import type { Bodega } from '../types/bodegaTypes';

export function isBodega(x: any): x is Bodega {
  return x && typeof x.id === 'number' && typeof x.nombre === 'string';
}

