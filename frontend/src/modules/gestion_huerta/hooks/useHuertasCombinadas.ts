import { useState } from 'react';
import { useHuertas } from './useHuertas';
import { useHuertasRentadas } from './useHuertaRentada';
import { HuertaFilters } from '../../../global/store/huertaSlice';
import { HRFilters } from '../../../global/store/huertaRentadaSlice';
import { Estado } from '../../../global/store/huertaSlice';

export function useHuertasCombinadas() {
  const propias = useHuertas();
  const rentadas = useHuertasRentadas();

  // Filtro de tipo controlado globalmente
  const [tipo, setTipo] = useState<string>('');

  // Solo usar los datos del store, ya paginados y filtrados por backend
  let huertas = [];
  let meta = propias.meta;
  let loading = propias.loading || rentadas.loading;
  if (tipo === 'propia') {
    huertas = propias.huertas;
    meta = propias.meta;
    loading = propias.loading;
  } else if (tipo === 'rentada') {
    huertas = rentadas.huertas;
    meta = rentadas.meta;
    loading = rentadas.loading;
  } else {
    huertas = [...propias.huertas, ...rentadas.huertas];
    meta = {
      count: propias.meta.count + rentadas.meta.count,
      next: propias.meta.next || rentadas.meta.next,
      previous: propias.meta.previous || rentadas.meta.previous,
    };
    loading = propias.loading || rentadas.loading;
  }

  // Métodos solo actualizan el store y disparan fetch, sin lógica local
  const setPage = (n: number) => {
    propias.setPage(n);
    rentadas.setPage(n);
  };

  const changeEstado = (e: Estado) => {
    propias.changeEstado(e);
    rentadas.changeEstado(e);
  };

  // Ahora changeFilters acepta el tipo y lo controla globalmente
  const changeFilters = (f: HuertaFilters & HRFilters & { tipo?: string }) => {
    const { tipo: tipoNuevo, ...backend } = f;
    setTipo(tipoNuevo || '');
    propias.changeFilters(backend);
    rentadas.changeFilters(backend);
  };

  const fetchAll = () => Promise.all([propias.refetch(), rentadas.refetch()]);

  return {
    huertas,
    loading,
    meta,
    page: propias.page,
    estado: propias.estado,
    filters: propias.filters,
    setPage,
    changeEstado,
    changeFilters,
    add: (p: any, t: 'propia' | 'rentada') => t === 'propia' ? propias.addHuerta(p) : rentadas.addHuerta(p),
    edit: (id: number, p: any, t: 'propia' | 'rentada') => t === 'propia' ? propias.editHuerta(id, p) : rentadas.editHuerta(id, p),
    remove: (id: number, t: 'propia' | 'rentada') => t === 'propia' ? propias.removeHuerta(id) : rentadas.removeHuerta(id),
    archive: (id: number, t: 'propia' | 'rentada') => t === 'propia' ? propias.archive(id) : rentadas.archive(id),
    restore: (id: number, t: 'propia' | 'rentada') => t === 'propia' ? propias.restore(id) : rentadas.restore(id),
    fetchAll,
    refetch: fetchAll,
    tipo, // expone el tipo global
    setTipo, // expone el setter para sincronizar desde la vista
  };
}
