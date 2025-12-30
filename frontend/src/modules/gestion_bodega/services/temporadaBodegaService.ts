/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import type {
  NotificationPayload as Notif,
  PaginationMeta,
  TemporadaBodega,
  TemporadaBodegaCreateData,
  TemporadaBodegaUpdateData,
  EstadoTemporadaBodega,
} from '../types/temporadaBodegaTypes';

// =============================================================================
// Config
// =============================================================================
const BASE_URL = '/bodega/temporadas/';

// =============================================================================
// Notificaciones y utilidades
// =============================================================================
function extractNotif(resp: any): Notif {
  // 1) Envelope del backend
  if (resp?.notification) return resp.notification as Notif;
  // 2) DRF error típico
  if (resp?.detail && typeof resp.detail === 'string') {
    return { type: 'error', message: resp.detail };
  }
  // 3) Fallback
  return { type: 'info', message: 'Operación procesada.' };
}

/** Limpia params/body quitando undefined/null/'' */
function compactParams(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach((k) => {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
}

/** Homologa meta cuando el backend devuelve DRF plano. */
function buildMetaFromDRF(
  resp: any,
  requested: { page?: number; page_size?: number }
): PaginationMeta {
  const count = resp?.count ?? (Array.isArray(resp?.results) ? resp.results.length : 0);
  const page = requested.page ?? 1;
  const page_size = requested.page_size ?? 10;
  const total_pages = Math.max(1, Math.ceil((count || 0) / (page_size || 10)));

  return {
    count,
    next: resp?.next ?? null,
    previous: resp?.previous ?? null,
    page,
    page_size,
    total_pages,
  };
}

/** Normaliza payload de list() para soportar envelope, DRF o arreglo plano. */
function pickListPayload(resp: any, requested: { page?: number; page_size?: number }) {
  // A) Envelope { success, notification, data: { temporadas, meta } }
  if (resp?.data?.temporadas) {
    const baseMeta = resp?.data?.meta ?? {};
    const meta: PaginationMeta = {
      count: baseMeta.count ?? (resp.data.temporadas?.length ?? 0),
      next: baseMeta.next ?? null,
      previous: baseMeta.previous ?? null,
      page: baseMeta.page ?? (requested.page ?? 1),
      page_size: baseMeta.page_size ?? (requested.page_size ?? 10),
      total_pages:
        baseMeta.total_pages ??
        Math.max(
          1,
          Math.ceil(
            (baseMeta.count ?? resp.data.temporadas?.length ?? 0) /
              (baseMeta.page_size ?? requested.page_size ?? 10)
          )
        ),
    };

    return {
      success: resp?.success ?? true,
      notification: extractNotif(resp),
      data: {
        temporadas: resp.data.temporadas as TemporadaBodega[],
        meta,
      },
      raw: resp,
    };
  }

  // B) DRF paginado
  if (Array.isArray(resp?.results)) {
    return {
      success: true,
      notification: extractNotif(resp),
      data: {
        temporadas: resp.results as TemporadaBodega[],
        meta: buildMetaFromDRF(resp, requested),
      },
    };
  }

  // C) Arreglo plano
  if (Array.isArray(resp)) {
    const page = requested.page ?? 1;
    const inferredSize = resp.length;
    const page_size = requested.page_size ?? (inferredSize || 10);
    const count = resp.length;
    const total_pages = Math.max(1, Math.ceil(count / page_size));

    return {
      success: true,
      notification: extractNotif(resp),
      data: {
        temporadas: resp as TemporadaBodega[],
        meta: {
          count,
          next: null,
          previous: null,
          page,
          page_size,
          total_pages,
        } as PaginationMeta,
      },
    };
  }

  // D) Fallback defensivo
  return {
    success: true,
    notification: extractNotif(resp),
    data: {
      temporadas: [] as TemporadaBodega[],
      meta: {
        count: 0,
        next: null,
        previous: null,
        page: requested.page ?? 1,
        page_size: requested.page_size ?? 10,
        total_pages: 1,
      } as PaginationMeta,
    },
  };
}

/**
 * Mapea `ordering` del FE al campo real del backend.
 * Útil cuando el FE usa `año` y el backend expone `año` (o viceversa).
 */
function mapOrdering(ordering?: string): string | undefined {
  if (!ordering) return undefined;

  const normalize = (s: string) =>
    s
      // quita espacios
      .trim()
      // normaliza tildes para comparar
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const raw = ordering;
  const desc = raw.startsWith('-');
  const key = desc ? raw.substring(1) : raw;

  const nk = normalize(key);
  let mapped = key;

  // Caso común: FE usa `año`, backend `año`
  if (nk === 'ano' || nk === 'año') mapped = 'año';

  // puedes añadir más mapeos aquí si tu API usa otros nombres
  // if (nk === 'bodega_nombre') mapped = 'bodega__nombre';

  return desc ? `-${mapped}` : mapped;
}

function mapEstadoToBackend(estado?: EstadoTemporadaBodega): string | undefined {
  if (!estado) return undefined;
  switch (estado) {
    case 'activas':
      return 'activos';
    case 'archivadas':
      return 'archivados';
    case 'todas':
      return 'todos';
    default:
      return estado;
  }
}

// =============================================================================
// Service
// =============================================================================
async function list(params: {
  page?: number;
  page_size?: number;
  estado?: EstadoTemporadaBodega; // 'activas' | 'archivadas' | 'todas'
  bodegaId?: number;
  año?: number;
  finalizada?: boolean | null;
  ordering?: string; // e.g. '-año'
  search?: string;
}) {
  const requested = {
    page: params.page ?? 1,
    page_size: params.page_size ?? 10,
  };

  try {
    const query = compactParams({
      ...requested,
      estado: mapEstadoToBackend(params.estado ?? 'activas'),
      bodega: params.bodegaId,
      año: params.año, // el backend recibe `año` (con tilde)
      finalizada: params.finalizada,
      ordering: mapOrdering(params.ordering),
      search: params.search,
    });

    const { data } = await apiClient.get(BASE_URL, { params: query });
    return pickListPayload(data, requested);
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: {
        temporadas: [] as TemporadaBodega[],
        meta: {
          count: 0,
          next: null,
          previous: null,
          page: requested.page,
          page_size: requested.page_size,
          total_pages: 1,
        } as PaginationMeta,
      },
    };
  }
}

async function getById(id: number) {
  try {
    const { data } = await apiClient.get(`${BASE_URL}${id}/`);
    if (data?.data?.temporada) {
      return {
        success: true,
        notification: extractNotif(data),
        data: data.data.temporada as TemporadaBodega,
      };
    }
    return {
      success: true,
      notification: extractNotif(data),
      data: (data as TemporadaBodega) ?? null,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null as unknown as TemporadaBodega,
    };
  }
}

async function create(payload: TemporadaBodegaCreateData) {
  try {
    const body = compactParams({
      bodega_id: payload.bodegaId,
      año: (payload as any)['año'] ?? (payload as any)['año'], // tolerante a ambos
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
    });

    const { data } = await apiClient.post(BASE_URL, body);

    const temporada =
      data?.data?.temporada ? (data.data.temporada as TemporadaBodega) : ((data as any) as TemporadaBodega);

    return {
      success: true,
      notification: extractNotif(data),
      data: temporada,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null as unknown as TemporadaBodega,
    };
  }
}

async function update(id: number, payload: TemporadaBodegaUpdateData) {
  try {
    const body = compactParams({
      año: (payload as any)['año'] ?? (payload as any)['año'],
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      finalizada: payload.finalizada,
    });

    const { data } = await apiClient.patch(`${BASE_URL}${id}/`, body);

    const temporada =
      data?.data?.temporada ? (data.data.temporada as TemporadaBodega) : ((data as any) as TemporadaBodega);

    return {
      success: true,
      notification: extractNotif(data),
      data: temporada,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null as unknown as TemporadaBodega,
    };
  }
}

async function archivar(id: number) {
  try {
    const { data } = await apiClient.post(`${BASE_URL}${id}/archivar/`);
    return {
      success: true,
      notification: extractNotif(data),
      data: (data?.data?.temporada ?? null) as TemporadaBodega | null,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return { success: false, notification: extractNotif(resp || err), data: null };
  }
}

async function restaurar(id: number) {
  try {
    const { data } = await apiClient.post(`${BASE_URL}${id}/restaurar/`);
    return {
      success: true,
      notification: extractNotif(data),
      data: (data?.data?.temporada ?? null) as TemporadaBodega | null,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return { success: false, notification: extractNotif(resp || err), data: null };
  }
}

async function toggleFinalizar(id: number) {
  try {
    const { data } = await apiClient.post(`${BASE_URL}${id}/finalizar/`);
    return {
      success: true,
      notification: extractNotif(data),
      data: (data?.data?.temporada ?? null) as TemporadaBodega | null,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return { success: false, notification: extractNotif(resp || err), data: null };
  }
}

async function remove(id: number) {
  try {
    const { data } = await apiClient.delete(`${BASE_URL}${id}/`);
    const payload = (data?.data ?? {}) as { deleted_id?: number; temporada_id?: number };
    const deletedId = payload.deleted_id ?? payload.temporada_id ?? id;
    return {
      success: true,
      notification: extractNotif(data),
      data: { deleted_id: deletedId },
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null,
    };
  }
}

const temporadaBodegaService = {
  list,
  getById,
  create,
  update,
  archivar,
  restaurar,
  toggleFinalizar,
  remove,
};

export default temporadaBodegaService;
