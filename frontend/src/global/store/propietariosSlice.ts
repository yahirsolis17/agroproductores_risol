import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { propietarioService} from '../../modules/gestion_huerta/services/propietarioService';
import { handleBackendNotification } from '../utils/NotificationEngine';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../../modules/gestion_huerta/types/propietarioTypes';

/* ---------- State ---------- */
interface PaginationMeta { count: number; next: string | null; previous: string | null; }
type Estado = 'activos' | 'archivados' | 'todos';

interface PropietarioState {
  list:    Propietario[];
  loading: boolean;
  error:   string | null;
  loaded:  boolean;
  meta:    PaginationMeta;
  page:    number;
  estado:  Estado;
}

const initialState: PropietarioState = {
  list: [], loading: false, error: null, loaded: false,
  meta: { count:0, next:null, previous:null },
  page: 1, estado: 'activos',
};

/* ---------- Thunks ---------- */
export const fetchPropietarios = createAsyncThunk(
  'propietarios/fetchAll',
  async ({ page, estado }: { page:number; estado:Estado }, { rejectWithValue }) => {
    try {
      const { propietarios, meta } = await propietarioService.list(page, estado);
      return { propietarios, meta, page, estado };
    } catch (err:any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const createPropietario = createAsyncThunk(
  'propietarios/create',
  async (payload: PropietarioCreateData, { rejectWithValue }) => {
    try {
      const res = await propietarioService.create(payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err:any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const updatePropietario = createAsyncThunk(
  'propietarios/update',
  async ({ id, payload }: { id:number; payload:PropietarioUpdateData }, { rejectWithValue }) => {
    try {
      const res = await propietarioService.update(id, payload);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    } catch (err:any) {
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const deletePropietario = createAsyncThunk(
  'propietarios/delete',
  async (id:number,{ rejectWithValue })=>{
    try{
      const res = await propietarioService.delete(id);
      handleBackendNotification(res);
      return id;
    }catch(err:any){
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const archivePropietario = createAsyncThunk(
  'propietarios/archive',
  async(id:number,{rejectWithValue})=>{
    try{
      const res = await propietarioService.archive(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    }catch(err:any){
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

export const restorePropietario = createAsyncThunk(
  'propietarios/restore',
  async(id:number,{rejectWithValue})=>{
    try{
      const res = await propietarioService.restore(id);
      handleBackendNotification(res);
      return res.data.propietario as Propietario;
    }catch(err:any){
      handleBackendNotification(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  }
);

/* ---------- Slice ---------- */
const propietariosSlice = createSlice({
  name:'propietarios',
  initialState,
  reducers:{
    setPage:  (s,a:PayloadAction<number>) => { s.page=a.payload; },
    setEstado:(s,a:PayloadAction<Estado>) => { s.estado=a.payload; s.page=1; },
  },
  extraReducers:b=>{
    b.addCase(fetchPropietarios.pending,   s=>{s.loading=true;});
    b.addCase(fetchPropietarios.fulfilled,(s,{payload})=>{
      s.list   = payload.propietarios;
      s.meta   = payload.meta;
      s.page   = payload.page;
      s.estado = payload.estado;
      s.loading=false; s.loaded=true;
    });
    b.addCase(fetchPropietarios.rejected,  s=>{s.loading=false; s.loaded=true;});

    b.addCase(createPropietario.fulfilled,(s,{payload})=>{s.list.unshift(payload);});
    b.addCase(updatePropietario.fulfilled,(s,{payload})=>{
      const i=s.list.findIndex(p=>p.id===payload.id);
      if(i!==-1) s.list[i]=payload;
    });
    b.addCase(deletePropietario.fulfilled,(s,{payload})=>{
      s.list = s.list.filter(p=>p.id!==payload);
    });
    b.addCase(archivePropietario.fulfilled,(s,{payload})=>{
      const i=s.list.findIndex(p=>p.id===payload.id);
      if(i!==-1) s.list[i]=payload;
    });
    b.addCase(restorePropietario.fulfilled,(s,{payload})=>{
      const i=s.list.findIndex(p=>p.id===payload.id);
      if(i!==-1) s.list[i]=payload;
    });
  }
});

export const { setPage, setEstado } = propietariosSlice.actions;
export default propietariosSlice.reducer;
