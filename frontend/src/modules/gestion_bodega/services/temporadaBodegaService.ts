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
const BASE_URL = '/bodega/temporadas/'; // ajusta si tu router usa otro path

// =============================================================================
// Helpers
// =============================================================================
function extractNotif(resp: any): Notif {
  // 1) wrapper del backend
  if (resp?.notification) return resp.notification as Notif;
  // 2) DRF error común
  if (resp?.detail && typeof resp.detail === 'string') {
    return { type: 'error', message: resp.detail };
  }
  // 3) fallback
  return { type: 'info', message: 'Operación procesada.' };
}

// compact de params/body sin genérico para evitar TS2322
function compactParams(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach((k) => {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
}

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

function pickListPayload(resp: any, requested: { page?: number; page_size?: number }) {
  // Caso A: wrapper { data: { temporadas, meta } }
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

  // Caso B: DRF paginado plano
  if (Array.isArray(resp?.results)) {
    return {
      success: true,
      notification: extractNotif(resp),
      data: {
        temporadas: resp.results as TemporadaBodega[],
        meta: buildMetaFromDRF(resp, requested),
      },
      raw: resp,
    };
  }

  // Caso C: arreglo plano
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
        },
      },
      raw: resp,
    };
  }

  // Fallback
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
    raw: resp,
  };
}

// =============================================================================
// Service
// =============================================================================
async function list(params: {
  page?: number;
  page_size?: number;
  estado?: EstadoTemporadaBodega; // 'activos' | 'archivados' | 'todos'
  bodegaId?: number;
  año?: number;
  finalizada?: boolean;
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
      estado: params.estado ?? 'activos',
      bodega: params.bodegaId,
      año: params.año,
      finalizada: params.finalizada,
      ordering: params.ordering,
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
      raw: resp || err,
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
        raw: data,
      };
    }
    return {
      success: true,
      notification: extractNotif(data),
      data: (data as TemporadaBodega) ?? null,
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null as unknown as TemporadaBodega,
      raw: resp || err,
    };
  }
}

async function create(payload: TemporadaBodegaCreateData & { bodegaId?: number }) {
  try {
    const body = compactParams({
      bodega_id: payload.bodegaId,
      año: (payload as any)['año'],
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
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null as unknown as TemporadaBodega,
      raw: resp || err,
    };
  }
}

async function update(id: number, payload: TemporadaBodegaUpdateData) {
  try {
    const body = compactParams({
      año: (payload as any)['año'],
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
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null as unknown as TemporadaBodega,
      raw: resp || err,
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
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return { success: false, notification: extractNotif(resp || err), data: null, raw: resp || err };
  }
}

async function restaurar(id: number) {
  try {
    const { data } = await apiClient.post(`${BASE_URL}${id}/restaurar/`);
    return {
      success: true,
      notification: extractNotif(data),
      data: (data?.data?.temporada ?? null) as TemporadaBodega | null,
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return { success: false, notification: extractNotif(resp || err), data: null, raw: resp || err };
  }
}

async function toggleFinalizar(id: number) {
  try {
    const { data } = await apiClient.post(`${BASE_URL}${id}/finalizar/`);
    return {
      success: true,
      notification: extractNotif(data),
      data: (data?.data?.temporada ?? null) as TemporadaBodega | null,
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return { success: false, notification: extractNotif(resp || err), data: null, raw: resp || err };
  }
}

async function remove(id: number) {
  try {
    const { data } = await apiClient.delete(`${BASE_URL}${id}/`);
    return {
      success: true,
      notification: extractNotif(data),
      data: { deleted_id: id },
      raw: data,
    };
  } catch (err: any) {
    const resp = err?.response?.data;
    return {
      success: false,
      notification: extractNotif(resp || err),
      data: null,
      raw: resp || err,
    };
  }
}

export const temporadaBodegaService = {
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
