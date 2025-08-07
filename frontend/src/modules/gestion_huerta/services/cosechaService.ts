/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

type ApiEnvelope<T> = {
  success: boolean;
  notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
  data: T;
};

export const cosechaService = {
  // ─── LIST ────────────────────────────────────────────────────────
  async list(
    page: number = 1,
    temporadaId: number,
    search?: string,
    estado?: 'activas'|'archivadas'|'todas',
  ) {
    const params: Record<string, any> = { page, temporada: temporadaId };
    if (search) params.search = search;
    if (estado) params.estado = estado;

    const { data } = await apiClient.get<ApiEnvelope<{
      cosechas: Cosecha[];
      meta: { count: number; next: string|null; previous: string|null };
    }>>('/huerta/cosechas/', { params });
    return data;
  },

  // ─── CREATE (con fallback temporada_id) ──────────────────────────
  async create(payload: CosechaCreateData) {
    try {
      const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
        '/huerta/cosechas/',
        payload
      );
      return data;
    } catch (err: any) {
      if (err?.response?.status === 400 && (payload as any).temporada && !(payload as any).temporada_id) {
        const alt: any = { ...payload, temporada_id: (payload as any).temporada };
        delete alt.temporada;
        const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
          '/huerta/cosechas/',
          alt
        );
        return data;
      }
      throw err;
    }
  },

  // ─── UPDATE ─────────────────────────────────────────────────────
  async update(id: number, payload: CosechaUpdateData) {
    const { data } = await apiClient.patch<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/`,
      payload
    );
    return data;
  },

  // ─── DELETE ─────────────────────────────────────────────────────
  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(
      `/huerta/cosechas/${id}/`
    );
    return data;
  },

  // ─── ARCHIVAR ──────────────────────────────────────────────────
  async archivar(id: number) {
    try {
      const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
        `/huerta/cosechas/${id}/archivar/`
      );
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
          `/huerta/cosechas/${id}/archive/`
        );
        return data;
      }
      throw err;
    }
  },

  // ─── RESTAURAR (des-archivar) ───────────────────────────────────
  async restaurar(id: number) {
    try {
      const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
        `/huerta/cosechas/${id}/restaurar/`
      );
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        try {
          const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
            `/huerta/cosechas/${id}/activar/`
          );
          return data;
        } catch (err2: any) {
          if (err2?.response?.status === 404) {
            const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
              `/huerta/cosechas/${id}/restore/`
            );
            return data;
          }
          throw err2;
        }
      }
      throw err;
    }
  },

  // ─── FINALIZAR ───────────────────────────────────────────────────
  async finalizar(id: number) {
    try {
      const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
        `/huerta/cosechas/${id}/finalizar/`
      );
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
          `/huerta/cosechas/${id}/toggle-finalizada/`
        );
        return data;
      }
      throw err;
    }
  },

  // ─── REACTIVAR FINALIZACIÓN ─────────────────────────────────────
  async reactivar(id: number) {
    try {
      const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
        `/huerta/cosechas/${id}/reactivar/`
      );
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
          `/huerta/cosechas/${id}/toggle-finalizada/`
        );
        return data;
      }
      throw err;
    }
  },

  // ─── TOGGLE FINALIZACIÓN (llama al endpoint que invierte el estado) ───
  async toggleFinalizada(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/toggle-finalizada/`
    );
    return data;
  },


  async getById(id: number): Promise<Cosecha> {
    const { data } = await apiClient.get<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/`
    );
    return data.data.cosecha;          //  ← extrae la cosecha y la devuelve
  }

};
