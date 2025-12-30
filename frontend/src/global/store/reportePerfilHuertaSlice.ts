import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { reportesProduccionService } from '../../modules/gestion_huerta/services/reportesProduccionService';
import { adaptPerfilHuertaToUI, withRetry } from '../../modules/gestion_huerta/utils/reportesAdapters';
import type { ReporteProduccionData } from '../../modules/gestion_huerta/types/reportesProduccionTypes';

interface ReportePerfilHuertaState {
  data: ReporteProduccionData | null;
  loading: boolean;
  error: string | null;
  huertaId: number | null;
  huertaRentadaId: number | null;
  años: number;
}

const initialState: ReportePerfilHuertaState = {
  data: null,
  loading: false,
  error: null,
  huertaId: null,
  huertaRentadaId: null,
  años: 5,
};

export const fetchReportePerfilHuerta = createAsyncThunk<
  { data: ReporteProduccionData; huertaId?: number; huertaRentadaId?: number; años: number },
  { huertaId?: number; huertaRentadaId?: number; años?: number },
  { rejectValue: string }
>('reportePerfilHuerta/fetch', async ({ huertaId, huertaRentadaId, años }, { rejectWithValue }) => {
  try {
    const resp = await withRetry(() =>
      reportesProduccionService.generarReportePerfilHuerta({
        formato: 'json',
        huerta_id: huertaId,
        huerta_rentada_id: huertaRentadaId,
        años: años ?? 5,
      })
    );
    if (!resp.success) {
      return rejectWithValue(resp.message || 'Error al cargar perfil de huerta');
    }
    return {
      data: adaptPerfilHuertaToUI(resp.data, huertaId, huertaRentadaId),
      huertaId,
      huertaRentadaId,
      años: años ?? 5,
    };
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar perfil de huerta');
  }
});

const reportePerfilHuertaSlice = createSlice({
  name: 'reportePerfilHuerta',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportePerfilHuerta.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportePerfilHuerta.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.huertaId = action.payload.huertaId ?? null;
        state.huertaRentadaId = action.payload.huertaRentadaId ?? null;
        state.años = action.payload.años;
      })
      .addCase(fetchReportePerfilHuerta.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar perfil de huerta';
      });
  },
});

export default reportePerfilHuertaSlice.reducer;
