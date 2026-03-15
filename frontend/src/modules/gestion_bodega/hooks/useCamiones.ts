// frontend/src/modules/gestion_bodega/hooks/useCamiones.ts
import { useState, useCallback, useRef } from 'react';
import camionesService from '../services/camionesService';

interface UseCamionesParams {
  bodegaId?: number;
  temporadaId?: number;
}

interface CamionesMeta {
  page: number;
  page_size: number;
  count: number;
  total_pages: number;
}

export function useCamiones({ bodegaId, temporadaId }: UseCamionesParams = {}) {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<CamionesMeta>({ page: 1, page_size: 10, count: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);

  const fetchCamiones = useCallback(async (params?: { page?: number; estado?: string | null }) => {
    if (!bodegaId || !temporadaId) return;
    const id = ++fetchRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await camionesService.list({
        bodega: bodegaId,
        temporada: temporadaId,
        page: params?.page ?? 1,
        ...(params?.estado ? { estado: params.estado } : {}),
      });
      if (id !== fetchRef.current) return; // stale
      const d = (resp as any).data ?? resp;
      setItems(d?.results ?? []);
      setMeta({
        page: d?.meta?.page ?? d?.page ?? 1,
        page_size: d?.meta?.page_size ?? 10,
        count: d?.meta?.count ?? d?.meta?.total ?? 0,
        total_pages: d?.meta?.total_pages ?? 1,
      });
    } catch (err: any) {
      if (id !== fetchRef.current) return;
      setError(err?.message || 'Error al cargar camiones.');
    } finally {
      if (id === fetchRef.current) setIsLoading(false);
    }
  }, [bodegaId, temporadaId]);

  return { items, meta, isLoading, error, fetchCamiones };
}
