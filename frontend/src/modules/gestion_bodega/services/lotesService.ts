import apiClient from "../../../global/api/apiClient";

export interface Lote {
    id: number;
    bodega: number;
    temporada: number;
    semana: number;
    codigo_lote: string;
    origen_nombre?: string;
    notas?: string;
    creado_en?: string;
}

export const lotesService = {
    search: async (params: { codigo_lote__icontains?: string; bodega?: number; temporada?: number }) => {
        const response = await apiClient.get<{ results: Lote[] }>("/gestion-bodega/lotes/", { params });
        return response.data;
    },

    getResumen: async (id: number) => {
        const response = await apiClient.get<any>(`/gestion-bodega/lotes/${id}/resumen/`);
        return response.data;
    }
};
