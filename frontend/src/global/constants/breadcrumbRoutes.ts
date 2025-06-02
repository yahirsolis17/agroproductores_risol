// src/global/constants/breadcrumbRoutes.ts
import { Crumb } from '../store/breadcrumbsSlice';

export const breadcrumbRoutes = {
  /** Lista de huertas */
  huertasList: (): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
  ],

  /** Temporadas de una huerta */
  temporadasList: (huertaId: number, huertaName: string): Crumb[] => [
    // ⬇⬇ ahora el id realmente se usa
    { label: `Huertas – ${huertaName}`, path: `/huertas?huerta_id=${huertaId}` },
    { label: 'Temporadas', path: '' },
  ],

  /** Cosechas de una temporada */
  cosechasList: (
    huertaId: number,
    huertaName: string,
    año: number,
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`, path: `/huertas?huerta_id=${huertaId}` },
    { label: `Temporada ${año}`,        path: `/temporadas?huerta_id=${huertaId}` },
    { label: 'Cosechas',                path: '' },
  ],

  /** Ventas & Inversiones */
  ventasInversiones: (
    huertaId: number,
    huertaName: string,
    año: number,
  ): Crumb[] => [
    { label: `Huertas – ${huertaName}`, path: `/huertas?huerta_id=${huertaId}` },
    { label: `Temporada ${año}`,        path: `/temporadas?huerta_id=${huertaId}` },
    { label: 'Ventas & Inversiones',    path: '' },
  ],
};
