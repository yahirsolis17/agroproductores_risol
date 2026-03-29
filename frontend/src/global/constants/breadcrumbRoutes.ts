import { Crumb } from '../store/breadcrumbsSlice';
import { filterForDisplay } from '../utils/uiTransforms';

/** Helper: arma querystring ignorando nulos/vacios y encodeando valores */
function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const entries = filterForDisplay(Object.entries(params), ([, v]) =>
    v !== undefined && v !== null && String(v).trim() !== ''
  );
  if (!entries.length) return '';
  const q = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `?${q}`;
}

const formatBodegaLabel = (nombre: string) => `Bodegas - ${nombre}`;

const buildBodegaTemporadaCrumbs = (
  bodegaId: number | string,
  nombre: string,
  temporadaId: number | string,
  anio: number
): Crumb[] => [
  { label: formatBodegaLabel(nombre), path: '/bodega' },
  { label: `Temporada ${anio}`, path: `/bodega/${bodegaId}/temporadas${qs({ temporada: temporadaId })}` },
];

export const breadcrumbRoutes = {
  /** Lista de huertas */
  huertasList: (): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
  ],

  /**
   * Temporadas de una huerta.
   * Mantiene el contexto en la URL para que, al recargar o volver desde otras vistas, no se pierda.
   */
  temporadasList: (
    huertaId: number,
    huertaNombre: string,
    tipo?: 'propia' | 'rentada',
    propietario?: string
  ): Crumb[] => [
    {
      label: `Huertas - ${huertaNombre || `#${huertaId}`}`,
      path: '/huertas',
    },
    {
      label: 'Temporadas',
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo,
        huerta_nombre: huertaNombre,
        propietario,
      })}`,
    },
  ],

  /**
   * Cosechas de una temporada.
   * El crumb "Temporada {anio}" enlaza con /temporadas preservando el contexto.
   * El crumb "Cosechas" incluye tambien su propio contexto por si recargas en esa vista.
   */
  cosechasList: (
    huertaId: number,
    huertaName: string,
    anio: number,
    temporadaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string; cosechaNombre?: string }
  ): Crumb[] => [
    {
      label: `Huertas - ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${anio}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    {
      label: 'Cosechas',
      path: `/cosechas${qs({
        temporada_id: temporadaId,
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
  ],

  /**
   * PreCosecha de una temporada.
   * Preserva el contexto para volver a /temporadas sin perder huerta/tipo/propietario.
   */
  precosechasList: (
    huertaId: number,
    huertaName: string,
    anio: number,
    _temporadaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string }
  ): Crumb[] => [
    {
      label: `Huertas - ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${anio}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    {
      label: 'PreCosecha',
      path: '',
    },
  ],

  /**
   * Ventas & Inversiones por cosecha.
   * Preserva el contexto al volver a /temporadas.
   */
  ventasInversiones: (
    huertaId: number,
    huertaName: string,
    anio: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string; temporadaId?: number; cosechaId?: number }
  ): Crumb[] => [
    {
      label: `Huertas - ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${anio}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    {
      label: 'Ventas & Inversiones',
      path: '',
    },
  ],

  /** Reporte de Cosecha */
  reporteCosecha: (
    huertaId: number,
    huertaName: string,
    anio: number,
    temporadaId: number,
    cosechaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string; cosechaNombre?: string }
  ): Crumb[] => [
    {
      label: `Huertas - ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${anio}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    {
      label: 'Cosechas',
      path: `/cosechas${qs({
        temporada_id: temporadaId,
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    {
      label: opts?.cosechaNombre
        ? `Reporte de Cosecha: ${opts.cosechaNombre}`
        : `Reporte de Cosecha #${cosechaId}`,
      path: '',
    },
  ],

  /** Reporte de Temporada */
  reporteTemporada: (
    huertaId: number,
    huertaName: string,
    anio: number,
    _temporadaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string }
  ): Crumb[] => [
    {
      label: `Huertas - ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${anio}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    { label: `Reporte de Temporada ${anio}`, path: '' },
  ],

  /** Reporte Perfil de Huerta */
  reporteHuertaPerfil: (
    huertaId: number,
    huertaName: string,
    _opts?: { tipo?: 'propia' | 'rentada'; propietario?: string }
  ): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
    { label: `Reporte de Huerta - ${huertaName || `#${huertaId}`}`, path: '' },
  ],

  // Gestion Bodega
  bodegaDashboard: (): Crumb[] => [
    { label: 'Bodegas', path: '/bodega' },
  ],

  bodegaTemporadas: (_bodegaId: number | string, nombreSolo: string): Crumb[] => [
    { label: formatBodegaLabel(nombreSolo), path: '/bodega' },
    { label: 'Temporadas', path: '' },
  ],

  bodegaCapturas: (
    bodegaId: number | string,
    nombreSolo: string,
    temporadaId: number | string,
    anio: number
  ): Crumb[] => [
    ...buildBodegaTemporadaCrumbs(bodegaId, nombreSolo, temporadaId, anio),
    { label: 'Capturas', path: '' },
  ],

  bodegaInventarios: (
    bodegaId: number | string,
    nombreSolo: string,
    temporadaId: number | string,
    anio: number
  ): Crumb[] => [
    ...buildBodegaTemporadaCrumbs(bodegaId, nombreSolo, temporadaId, anio),
    { label: 'Inventarios', path: '' },
  ],

  bodegaLogistica: (
    bodegaId: number | string,
    nombreSolo: string,
    temporadaId: number | string,
    anio: number
  ): Crumb[] => [
    ...buildBodegaTemporadaCrumbs(bodegaId, nombreSolo, temporadaId, anio),
    { label: 'Logistica', path: '' },
  ],

  bodegaGastos: (
    bodegaId: number | string,
    nombreSolo: string,
    temporadaId: number | string,
    anio: number
  ): Crumb[] => [
    ...buildBodegaTemporadaCrumbs(bodegaId, nombreSolo, temporadaId, anio),
    { label: 'Gastos', path: '' },
  ],

  bodegaCierres: (
    bodegaId: number | string,
    nombreSolo: string,
    temporadaId: number | string,
    anio: number
  ): Crumb[] => [
    ...buildBodegaTemporadaCrumbs(bodegaId, nombreSolo, temporadaId, anio),
    { label: 'Cierres', path: '' },
  ],

  bodegaReportes: (
    bodegaId: number | string,
    nombreSolo: string,
    temporadaId: number | string,
    anio: number
  ): Crumb[] => [
    ...buildBodegaTemporadaCrumbs(bodegaId, nombreSolo, temporadaId, anio),
    { label: 'Reportes', path: '' },
  ],
};
