// src/global/constants/breadcrumbRoutes.ts
import { Crumb } from '../store/breadcrumbsSlice';

type TipoHuerta = 'propia' | 'rentada';

function buildTemporadasPath(huertaId: number, tipo?: TipoHuerta, huertaNombre?: string, propietario?: string) {
  const qp = new URLSearchParams();
  qp.set('huerta_id', String(huertaId));
  if (tipo) qp.set('tipo', tipo);
  if (huertaNombre) qp.set('huerta_nombre', huertaNombre);
  if (propietario) qp.set('propietario', propietario);
  return `/temporadas?${qp.toString()}`;
}

function buildCosechasPath(temporadaId: number, huertaId?: number, tipo?: TipoHuerta, huertaNombre?: string, propietario?: string) {
  const qp = new URLSearchParams();
  qp.set('temporada_id', String(temporadaId));
  if (huertaId) qp.set('huerta_id', String(huertaId));
  if (tipo) qp.set('tipo', tipo);
  if (huertaNombre) qp.set('huerta_nombre', huertaNombre);
  if (propietario) qp.set('propietario', propietario);
  return `/cosechas?${qp.toString()}`;
}

function buildFinanzasPath(temporadaId: number, cosechaId: number, huertaId?: number, tipo?: TipoHuerta, huertaNombre?: string, propietario?: string) {
  const qp = new URLSearchParams();
  if (huertaId) qp.set('huerta_id', String(huertaId));
  if (tipo) qp.set('tipo', tipo);
  if (huertaNombre) qp.set('huerta_nombre', huertaNombre);
  if (propietario) qp.set('propietario', propietario);
  const q = qp.toString();
  return q ? `/finanzas/${temporadaId}/${cosechaId}?${q}` : `/finanzas/${temporadaId}/${cosechaId}`;
}

export const breadcrumbRoutes = {
  /** Lista de huertas */
  huertasList: (): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
  ],

  /** Temporadas de una huerta */
  temporadasList: (
    huertaId: number,
    huertaNombre: string,
    tipo?: TipoHuerta,
    propietario?: string
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaNombre || `#${huertaId}`}`,
      path: '/huertas',
    },
    {
      label: 'Temporadas',
      path: buildTemporadasPath(huertaId, tipo, huertaNombre, propietario),
    },
  ],

  /** Cosechas de una temporada */
  cosechasList: (
    huertaId: number,
    huertaName: string,
    año: number,
    temporadaId: number,
    tipo?: TipoHuerta,
    propietario?: string
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaName || `#${huertaId}`}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${año}`,
      path: buildTemporadasPath(huertaId, tipo, huertaName, propietario),
    },
    {
      label: 'Cosechas',
      path: buildCosechasPath(temporadaId, huertaId, tipo, huertaName, propietario),
    },
  ],

  /** Ventas & Inversiones (Finanzas por Cosecha) */
  ventasInversiones: (
    huertaId: number,
    huertaName: string,
    año: number,
    temporadaId: number,
    cosechaId: number,
    tipo?: TipoHuerta,
    propietario?: string
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaName || `#${huertaId}`}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${año}`,
      path: buildTemporadasPath(huertaId, tipo, huertaName, propietario),
    },
    {
      label: 'Ventas & Inversiones',
      path: buildFinanzasPath(temporadaId, cosechaId, huertaId, tipo, huertaName, propietario), // puedes poner '' si prefieres no linkear el último
    },
  ],
};
