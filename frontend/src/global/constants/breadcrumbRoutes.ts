import { Crumb } from '../store/breadcrumbsSlice';

/** Helper: arma querystring ignorando nulos/vacíos y encodeando valores */
function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && String(v).trim() !== ''
  );
  if (!entries.length) return '';
  const q = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `?${q}`;
}

export const breadcrumbRoutes = {
  /** Lista de huertas */
  huertasList: (): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
  ],

  /**
   * Temporadas de una huerta
   * Mantiene el contexto en la URL (huerta_id, tipo, huerta_nombre, propietario)
   * para que, al recargar o volver desde otras vistas, no se pierda.
   */
  temporadasList: (
    huertaId: number,
    huertaNombre: string,
    tipo?: 'propia' | 'rentada',
    propietario?: string
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaNombre || `#${huertaId}`}`,
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
   * Cosechas de una temporada
   * → el crumb "Temporada {año}" enlaza con /temporadas preservando huerta_id/tipo/huerta_nombre/propietario
   * → el crumb "Cosechas" incluye también su propio contexto por si recargas en Cosechas.
   */
  cosechasList: (
    huertaId: number,
    huertaName: string,
    año: number,
    temporadaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string; cosechaNombre?: string }
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${año}`,
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
   * Ventas & Inversiones por cosecha
   * → preserva el contexto al volver a /temporadas
   * (si quieres, puedes agregar aquí un crumb intermedio a Cosechas; lo dejo como antes).
   */
  ventasInversiones: (
    huertaId: number,
    huertaName: string,
    año: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string; temporadaId?: number; cosechaId?: number }
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${año}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    {
      label: 'Ventas & Inversiones',
      path: '', // vista actual
    },
  ],

  /** Reporte de Cosecha */
  reporteCosecha: (
    huertaId: number,
    huertaName: string,
    año: number,
    temporadaId: number,
    cosechaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string; cosechaNombre?: string }
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${año}`,
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
      path: ''
    },
  ],

  /** Reporte de Temporada */
  reporteTemporada: (
    huertaId: number,
    huertaName: string,
    año: number,
    _temporadaId: number,
    opts?: { tipo?: 'propia' | 'rentada'; propietario?: string }
  ): Crumb[] => [
    {
      label: `Huertas – ${huertaName}`,
      path: '/huertas',
    },
    {
      label: `Temporada ${año}`,
      path: `/temporadas${qs({
        huerta_id: huertaId,
        tipo: opts?.tipo,
        huerta_nombre: huertaName,
        propietario: opts?.propietario,
      })}`,
    },
    { label: `Reporte de Temporada ${año}`, path: '' },
  ],

  /** Reporte Perfil de Huerta */
  reporteHuertaPerfil: (
    huertaId: number,
    huertaName: string,
    _opts?: { tipo?: 'propia' | 'rentada'; propietario?: string }
  ): Crumb[] => [
    { label: 'Huertas', path: '/huertas' },
    { label: `Reporte de Huerta – ${huertaName || `#${huertaId}`}`, path: '' },
  ],
};
