import { useCallback, useState } from 'react';
import reportesBodegaService, {
  type ReporteSemanalDTO,
  type ReporteTemporadaDTO,
} from '../services/reportesBodegaService';
import type { ReporteBodegaData, ReportesBodegaState } from '../types/reportesBodegaTypes';

const initialState: ReportesBodegaState = {
  semanalData: null,
  temporadaData: null,
  isLoading: false,
  error: null,
};

export function useReportesBodega() {
  const [state, setState] = useState<ReportesBodegaState>(initialState);

  const fetchSemanal = useCallback(async (params: ReporteSemanalDTO) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const response = await reportesBodegaService.generarReporteSemanal({
      ...params,
      formato: 'json',
    });

    if (!response.success) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: response.message || 'Error al cargar reporte semanal',
        semanalData: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      semanalData: (response.data as ReporteBodegaData) || null,
    }));
  }, []);

  const fetchTemporada = useCallback(async (params: ReporteTemporadaDTO) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const response = await reportesBodegaService.generarReporteTemporada({
      ...params,
      formato: 'json',
    });

    if (!response.success) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: response.message || 'Error al cargar reporte de temporada',
        temporadaData: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      temporadaData: (response.data as ReporteBodegaData) || null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    semanalData: state.semanalData,
    temporadaData: state.temporadaData,
    isLoading: state.isLoading,
    error: state.error,
    fetchSemanal,
    fetchTemporada,
    clearError,
  };
}
