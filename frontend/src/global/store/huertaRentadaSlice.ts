/* --------------------------------------------------------------------------
 *  src/global/store/huertaRentadaSlice.ts
 *  Lógica clonada de Propietarios / Huertas ⟶ page + estado + filtros backend
 * -------------------------------------------------------------------------- */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { huertaRentadaService }     from '../../modules/gestion_huerta/services/huertaRentadaService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../../modules/gestion_huerta/types/huertaRentadaTypes';

/* ───────── Tipos ───────── */
export type Estado = 'activos' | 'archivados' | 'todos';
export interface HRFilters { nombre?:string; propietario?:number; }

interface PaginationMeta { count:number; next:string|null; previous:string|null; }

interface HuertaRentadaState {
  list:    HuertaRentada[];
  loaded:  boolean;
  loading: boolean;
  error:   string|null;
  page:    number;
  estado:  Estado;
  filters: HRFilters;
  meta:    PaginationMeta;
}

const initialState: HuertaRentadaState = {
  list:[], loaded:false, loading:false, error:null,
  page:1, estado:'activos', filters:{},
  meta:{count:0,next:null,previous:null},
};

/* ───────── Thunks ───────── */
export const fetchHuertasRentadas = createAsyncThunk(
  'huertaRentada/fetch',
  async ({ page, estado, filters }:{page:number;estado:Estado;filters:HRFilters}) =>
    await huertaRentadaService.list(page, estado, filters)
);

export const createHuertaRentada = createAsyncThunk(
  'huertaRentada/create',
  async (payload:HuertaRentadaCreateData,{rejectWithValue})=>{
    try{
      const res = await huertaRentadaService.create(payload);
      handleBackendNotification(res);
      return res.data.huerta_rentada as HuertaRentada;
    }catch(e:any){
      handleBackendNotification(e.response?.data);
      return rejectWithValue(e);
    }
  }
);

export const updateHuertaRentada = createAsyncThunk(
  'huertaRentada/update',
  async ({id,payload}:{id:number;payload:HuertaRentadaUpdateData},{rejectWithValue})=>{
    try{
      const res = await huertaRentadaService.update(id,payload);
      handleBackendNotification(res);
      return res.data.huerta_rentada as HuertaRentada;
    }catch(e:any){
      handleBackendNotification(e.response?.data);
      return rejectWithValue(e);
    }
  }
);

export const deleteHuertaRentada = createAsyncThunk(
  'huertaRentada/delete',
  async (id:number,{rejectWithValue})=>{
    try{
      const res = await huertaRentadaService.delete(id);
      handleBackendNotification(res);
      return id;
    }catch(e:any){
      handleBackendNotification(e.response?.data);
      return rejectWithValue(e);
    }
  }
);

export const archiveHuertaRentada = createAsyncThunk(
  'huertaRentada/archive',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.archivar(id);
      handleBackendNotification(res);
      return { id, archivado_en: new Date().toISOString() };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al archivar huerta rentada');
    }
  }
);

export const restoreHuertaRentada = createAsyncThunk(
  'huertaRentada/restore',
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await huertaRentadaService.restaurar(id);
      handleBackendNotification(res);
      return { id, archivado_en: null };
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data || 'Error al restaurar huerta rentada');
    }
  }
);

/* ───────── Slice ───────── */
const hrSlice = createSlice({
  name:'huertaRentada',
  initialState,
  reducers:{
    setPage   :(s,a:PayloadAction<number> )      =>{ s.page   = a.payload; },
    setEstado :(s,a:PayloadAction<Estado> )      =>{ s.estado = a.payload; s.page=1; },
    setFilters:(s,a:PayloadAction<HRFilters>)    =>{ s.filters= a.payload; s.page=1; },
  },
  extraReducers:b=>{
    b.addCase(fetchHuertasRentadas.pending,  s=>{ s.loading=true; s.error=null; });
    b.addCase(fetchHuertasRentadas.fulfilled,(s,{payload})=>{
      s.list  = payload.huertas_rentadas;
      s.meta  = payload.meta;
      s.loaded=true; s.loading=false;
    });
    b.addCase(fetchHuertasRentadas.rejected, (s,{error})=>{
      s.loading=false; s.loaded=true;
      s.error = error.message ?? 'Error al cargar huertas rentadas';
    });

    /* alta / edición local */
    b.addCase(createHuertaRentada.fulfilled,(s,{payload})=>{
      if(s.estado==='activos') s.list.unshift(payload);
      s.meta.count += 1;
    });
    b.addCase(updateHuertaRentada.fulfilled,(s,{payload})=>{
      const i = s.list.findIndex(h=>h.id===payload.id);
      if(i!==-1) s.list[i]=payload;
    });
    b.addCase(deleteHuertaRentada.fulfilled,(s,{payload:id})=>{
      s.list = s.list.filter(h=>h.id!==id);
      if(s.meta.count>0) s.meta.count -= 1;
    });
    b.addCase(archiveHuertaRentada.fulfilled, (s, { payload }) => {
      if (s.estado === 'activos') {
        s.list = s.list.filter(h => h.id !== payload.id);
      } else if (s.estado !== 'archivados') {
        const i = s.list.findIndex(h => h.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
    b.addCase(restoreHuertaRentada.fulfilled, (s, { payload }) => {
      if (s.estado === 'archivados') {
        s.list = s.list.filter(h => h.id !== payload.id);
      } else if (s.estado !== 'activos') {
        const i = s.list.findIndex(h => h.id === payload.id);
        if (i !== -1) s.list[i].archivado_en = payload.archivado_en;
      }
    });
  }
});

export const {
  setPage   : setHRPage,
  setEstado : setHREstado,
  setFilters: setHRFilters,
} = hrSlice.actions;
export default hrSlice.reducer;

// No cambios necesarios en la lógica principal, ya que el slice ya maneja filtros, página y fetch desde backend correctamente.
// Solo aseguro que no haya lógica de filtrado local ni paginación local en el slice.
