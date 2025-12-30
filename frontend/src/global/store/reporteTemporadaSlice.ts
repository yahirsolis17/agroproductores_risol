import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { reportesProduccionService } from '../../modules/gestion_huerta/services/reportesProduccionService';
import { adaptTemporadaToUI, withRetry } from '../../modules/gestion_huerta/utils/reportesAdapters';
import type { ReporteProduccionData } from '../../modules/gestion_huerta/types/reportesProduccionTypes';

interface ReporteTemporadaState {
  data: ReporteProduccionData | null;
  loading: boolean;
  error: string | null;
  temporadaId: number | null;
}

const initialState: ReporteTemporadaState = {
  data: null,
  loading: false,
  error: null,
  temporadaId: null,
};

export const fetchReporteTemporada = createAsyncThunk<
  { data: ReporteProduccionData; temporadaId: number },
  { temporadaId: number },
  { rejectValue: string }
>('reporteTemporada/fetch', async ({ temporadaId }, { rejectWithValue }) => {
  try {
    const resp = await withRetry(() =>
      reportesProduccionService.generarReporteTemporada({ temporada_id: temporadaId, formato: 'json' })
    );
    if (!resp.success) {
      return rejectWithValue(resp.message || 'Error al cargar reporte de temporada');
    }
    return { data: adaptTemporadaToUI(resp.data), temporadaId };
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar reporte de temporada');
  }
});

const reporteTemporadaSlice = createSlice({
  name: 'reporteTemporada',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReporteTemporada.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReporteTemporada.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.temporadaId = action.payload.temporadaId;
      })
      .addCase(fetchReporteTemporada.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar reporte de temporada';
      });
  },
});

export default reporteTemporadaSlice.reducer;
