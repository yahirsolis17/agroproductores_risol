import { HuertaRentada } from '../types/huertaRentadaTypes';

/** Devuelve true si el registro es una huerta rentada */
export function isRentada(h: any): h is HuertaRentada {
  return 'monto_renta_palabras' in h;
}

