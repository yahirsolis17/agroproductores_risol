// ============================================================================
// src/global/store/categoriaInversionSlice.ts
// ============================================================================
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { categoriaInversionService } from '../../modules/gestion_huerta/services/categoriaInversionService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import { CategoriaInversion, CategoriaInversionCreateData, CategoriaInversionUpdateData } from '../../modules/gestion_huerta/types/categoriaInversionTypes';

interface PaginationMeta { count: number; next: string | null; previous: string | null; }

interface CategoriaState {
  list:    CategoriaInversion[];
  loading: boolean;
  loaded:  boolean;
  error:   string | null;
  page:    number;
  meta:    PaginationMeta;
}

const initialState: CategoriaState = {
  list:    [],
  loading: false,
  loaded:  false,
  error:   null,
  page:    1,
  meta:    { count: 0, next: null, previous: null },
};

export const fetchCategorias = createAsyncThunk<
  { categorias: CategoriaInversion[]; meta: PaginationMeta; page: number },
  number,
  { rejectValue: string }
>(
  'categoriasInversion/fetch',
  async (page = 1, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.listActive(page);
      if (res.notification) handleBackendNotification(res);
      return { categorias: res.data.categorias, meta: res.data.meta, page };
    } catch (err: any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al cargar categorías');
    }
  }
);

export const createCategoria  = createAsyncThunk<CategoriaInversion,  CategoriaInversionCreateData, { rejectValue: string }>(
  'categoriasInversion/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.create(payload);
      if (res.notification) handleBackendNotification(res);
      return res.data.categoria;
    } catch (err:any) {
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al crear categoría');
    }
  }
);

export const updateCategoria  = createAsyncThunk<CategoriaInversion,  { id:number; payload:CategoriaInversionUpdateData }, { rejectValue:string }>(
  'categoriasInversion/update',
  async ({id,payload}, { rejectWithValue }) => {
    try {
      const res = await categoriaInversionService.update(id,payload);
      if (res.notification) handleBackendNotification(res);
      return res.data.categoria;
    } catch (err:any){
      handleBackendNotification(err.response?.data || err);
      return rejectWithValue('Error al actualizar categoría');
    }
  }
);

export const archiveCategoria = createAsyncThunk<CategoriaInversion,  number, { rejectValue:string }>(
  'categoriasInversion/archive',
  async (id,{rejectWithValue})=>{
    try { const res = await categoriaInversionService.archive(id); if (res.notification) handleBackendNotification(res); return res.data.categoria; }
    catch(err:any){ handleBackendNotification(err.response?.data || err); return rejectWithValue('Error al archivar categoría'); }
  }
);

export const restoreCategoria = createAsyncThunk<CategoriaInversion,  number, { rejectValue:string }>(
  'categoriasInversion/restore',
  async (id,{rejectWithValue})=>{
    try { const res = await categoriaInversionService.restore(id); if (res.notification) handleBackendNotification(res); return res.data.categoria; }
    catch(err:any){ handleBackendNotification(err.response?.data || err); return rejectWithValue('Error al restaurar categoría'); }
  }
);

export const deleteCategoria  = createAsyncThunk<number, number, { rejectValue:string }>(
  'categoriasInversion/delete',
  async (id,{rejectWithValue})=>{
    try { const res = await categoriaInversionService.remove(id); if (res.notification) handleBackendNotification(res); return id; }
    catch(err:any){ handleBackendNotification(err.response?.data || err); return rejectWithValue('Error al eliminar categoría'); }
  }
);

const categoriaSlice = createSlice({
  name: 'categoriasInversion',
  initialState,
  reducers: { setPage: (s, a:PayloadAction<number>) => { s.page = a.payload; } },
  extraReducers: (b) => {
    b.addCase(fetchCategorias.pending,   s => { s.loading = true; s.error = null; });
    b.addCase(fetchCategorias.fulfilled, (s,{payload})=>{ s.list = payload.categorias; s.meta = payload.meta; s.page = payload.page; s.loading = false; s.loaded = true; });
    b.addCase(fetchCategorias.rejected,  (s,{payload,error})=>{ s.loading = false; s.loaded = true; s.error = payload ?? error.message ?? 'Error'; });

    b.addCase(createCategoria.fulfilled, (s,{payload})=>{ s.list.unshift(payload); s.meta.count += 1; });
    b.addCase(updateCategoria.fulfilled, (s,{payload})=>{ const i = s.list.findIndex(c=>c.id===payload.id); if (i!==-1) s.list[i]=payload; });
    b.addCase(archiveCategoria.fulfilled,(s,{payload})=>{ s.list = s.list.filter(c=>c.id!==payload.id); });
    b.addCase(restoreCategoria.fulfilled,(s,{payload})=>{ s.list.unshift(payload); });
    b.addCase(deleteCategoria.fulfilled, (s,{payload:id})=>{ s.list = s.list.filter(c=>c.id!==id); if (s.meta.count>0) s.meta.count--; });
  },
});

export const { setPage } = categoriaSlice.actions;
export default categoriaSlice.reducer;

