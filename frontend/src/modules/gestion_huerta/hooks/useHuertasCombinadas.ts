// src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts
import { useHuertas }          from './useHuertas';
import { useHuertasRentadas }  from './useHuertaRentada';

/**
 * Expone una vista unificada de huertas propias + rentadas.
 * Mantiene helpers en la misma forma que cada hook individual.
 */
export function useHuertasCombinadas() {
  const propias  = useHuertas();
  const rentadas = useHuertasRentadas();

  /* ---------- Lista combinada ---------- */
  const huertas = [...propias.huertas, ...rentadas.huertas];

  /* ---------- Helpers que delegan ---------- */
  const add = (payload: any, tipo: 'propia' | 'rentada') =>
    tipo === 'propia'
      ? propias.addHuerta(payload)
      : rentadas.addHuerta(payload);

  const edit = (id: number, payload: any, tipo: 'propia' | 'rentada') =>
    tipo === 'propia'
      ? propias.editHuerta(id, payload)
      : rentadas.editHuerta(id, payload);

  const remove = (id: number, tipo: 'propia' | 'rentada') =>
    tipo === 'propia'
      ? propias.removeHuerta(id)
      : rentadas.removeHuerta(id);

  const toggleLocal = (id: number, activo: boolean, tipo: 'propia' | 'rentada') =>
    tipo === 'propia'
      ? propias.toggleActivoLocal(id, activo)
      : rentadas.toggleActivoLocal(id, activo);

  /* ---------- Export ---------- */
  return {
    huertas,
    loading: propias.loading || rentadas.loading,
    page: propias.page,                 // paginación unificada (usa la de propias)
    setPage: propias.setPage,

    add,
    edit,
    remove,
    toggleLocal,

    /* recarga paralela */
    fetchAll: async () => {
      await Promise.all([propias.fetchHuertas(), rentadas.fetchHuertas()]);
    },
  };
}
