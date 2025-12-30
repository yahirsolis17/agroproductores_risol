import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { reportesProduccionService } from '../../modules/gestion_huerta/services/reportesProduccionService';
import { adaptCosechaToUI } from '../../modules/gestion_huerta/utils/reportesAdapters';
import type { ReporteProduccionData } from '../../modules/gestion_huerta/types/reportesProduccionTypes';

interface ReporteCosechaState {
  data: ReporteProduccionData | null;
  loading: boolean;
  error: string | null;
  cosechaId: number | null;
  from?: string | null;
  to?: string | null;
}

const initialState: ReporteCosechaState = {
  data: null,
  loading: false,
  error: null,
  cosechaId: null,
  from: null,
  to: null,
};

export const fetchReporteCosecha = createAsyncThunk<
  { data: ReporteProduccionData; cosechaId: number; from?: string; to?: string },
  { cosechaId: number; from?: string; to?: string },
  { rejectValue: string }
>('reporteCosecha/fetch', async ({ cosechaId, from, to }, { rejectWithValue }) => {
  try {
    const resp = await reportesProduccionService.generarReporteCosecha({
      cosecha_id: cosechaId,
      formato: 'json',
    });
    if (!resp.success) {
      return rejectWithValue(resp.message || 'Error al cargar reporte de cosecha');
    }
    return { data: adaptCosechaToUI(resp.data, from, to), cosechaId, from, to };
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Error al cargar reporte de cosecha');
  }
});

const reporteCosechaSlice = createSlice({
  name: 'reporteCosecha',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReporteCosecha.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReporteCosecha.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.cosechaId = action.payload.cosechaId;
        state.from = action.payload.from ?? null;
        state.to = action.payload.to ?? null;
      })
      .addCase(fetchReporteCosecha.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error al cargar reporte de cosecha';
      });
  },
});

export default reporteCosechaSlice.reducer;
