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
    huertaName: string
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`, path: '/huertas' },
    { label: 'Temporadas',               path: `/temporadas?huerta_id=${huertaId}` },
  ],

  /** Cosechas de una temporada */
  cosechasList: (
    huertaId: number,
    huertaName: string,
    año: number,
    temporadaId: number    // ← nuevo parámetro
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`, path: '/huertas' },
    { label: `Temporada ${año}`,        path: `/temporadas?huerta_id=${huertaId}` },
    { label: 'Cosechas',                path: `/cosechas?temporada_id=${temporadaId}` }, // ← ahora sí enlaza
  ],

  /** Ventas & Inversiones */
  ventasInversiones: (
    huertaId: number,
    huertaName: string,
    año: number
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`,     path: '/huertas' },
    { label: `Temporada ${año}`,            path: `/temporadas?huerta_id=${huertaId}` },
    { label: 'Ventas & Inversiones',        path: '' /* permanece en la vista actual */ },
  ],
};
