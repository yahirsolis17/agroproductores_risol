// src/global/constants/breadcrumbRoutes.ts
import { Crumb } from '../store/breadcrumbsSlice';

export const breadcrumbRoutes = {
  /** Lista de huertas */
  huertasList: (): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
  ],

  /** Temporadas de una huerta */
  temporadasList: (
    huertaId: number,
    huertaName: string,
    tipo: 'propia' | 'rentada'
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`, path: `/huertas` },
    { label: 'Temporadas',               path: `/temporadas?huerta_id=${huertaId}&tipo=${tipo}` },
  ],

  /** Cosechas de una temporada */
  cosechasList: (
    huertaId: number,
    huertaName: string,
    año: number,
    temporadaId: number,
    tipo: 'propia' | 'rentada'
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`, path: `/huertas` },
    { label: `Temporada ${año}`,        path: `/temporadas?huerta_id=${huertaId}&tipo=${tipo}` },
    { label: 'Cosechas',                path: `/cosechas?temporada_id=${temporadaId}` },
  ],

  /** Ventas & Inversiones */
  ventasInversiones: (
    huertaId: number,
    huertaName: string,
    año: number,
    tipo: 'propia' | 'rentada'
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`,     path: `/huertas` },
    { label: `Temporada ${año}`,            path: `/temporadas?huerta_id=${huertaId}&tipo=${tipo}` },
    { label: 'Ventas & Inversiones',        path: '' /* permanece en la vista actual */ },
  ],
};
