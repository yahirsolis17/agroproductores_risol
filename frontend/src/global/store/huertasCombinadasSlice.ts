import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertasCombinadasService, HCFilters, RegistroCombinado } from '../../modules/gestion_huerta/services/huertasCombinadasService';
import { PaginationMeta, Estado } from '../../modules/gestion_huerta/types/shared';
import { handleBackendNotification } from '../utils/NotificationEngine'; // ← para estandarizar errores

interface HCState {
  list:    RegistroCombinado[];
  loading: boolean;
  error:   string | null;
  page:    number;
  estado:  Estado;
  filters: HCFilters;
  meta:    PaginationMeta;
}

const initialState: HCState = {
  list: [], loading: false, error: null, page: 1, estado: 'activos', filters: {},
  meta: { count: 0, next: null, previous: null, page: 1, page_size: 10, total_pages: 1 }, // ← actualizado
};

export const fetchHuertasCombinadas = createAsyncThunk<
  { huertas: RegistroCombinado[]; meta: PaginationMeta; page: number },
  { page: number; estado: Estado; filters: HCFilters },
  { rejectValue: string }
>(
  'huertasCombinadas/fetch',
  async ({ page, estado, filters }, thunkAPI) => {
    try {
      const { signal } = thunkAPI;
      const { huertas, meta } = await huertasCombinadasService.list(page, estado, filters, { signal });
      return { huertas, meta, page };
    } catch (err: any) {
      handleBackendNotification(err?.response?.data); // ← homogéneo
      return thunkAPI.rejectWithValue(err?.response?.data?.message ?? 'Error al cargar huertas combinadas');
    }
  }
);

const hcSlice = createSlice({
  name: 'huertasCombinadas',
  initialState,
  reducers: {
    setPage:    (s, a: PayloadAction<number>)    => { s.page = a.payload; },
    setEstado:  (s, a: PayloadAction<Estado>)    => { s.estado = a.payload; s.page = 1; },
    setFilters: (s, a: PayloadAction<HCFilters>) => { s.filters = a.payload; s.page = 1; },
  },
  extraReducers: (b) => {
    b.addCase(fetchHuertasCombinadas.pending,   (s)                     => { s.loading = true;  s.error = null; });
    b.addCase(fetchHuertasCombinadas.fulfilled, (s, { payload })        => {
      s.list = payload.huertas; s.meta = payload.meta; s.page = payload.page; s.loading = false;
    });
    b.addCase(fetchHuertasCombinadas.rejected,  (s, { payload, error }) => {
      s.loading = false; s.error = (payload as string) ?? error.message ?? 'Error desconocido';
    });
  },
});
export const { setPage, setEstado, setFilters } = hcSlice.actions;
export default hcSlice.reducer;
