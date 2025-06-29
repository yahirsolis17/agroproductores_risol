// src/modules/gestion_huerta/components/huerta/HuertaTable.tsx
import React from 'react';
import { Chip, Tooltip, Button } from '@mui/material';
import { TableLayout, Column, FilterConfig } from '../../../../components/common/TableLayout';

import { Huerta }         from '../../types/huertaTypes';
import { HuertaRentada }  from '../../types/huertaRentadaTypes';
import ActionsMenu        from '../common/ActionsMenu';

/* ───────── Tipos de fila ───────── */
export type RegistroPropia  = Huerta        & { tipo: 'propia';  monto_renta?: number };
export type RegistroRentada = HuertaRentada & { tipo: 'rentada'; monto_renta: number };
export type Registro        = RegistroPropia | RegistroRentada;

/* ───────── Columnas ───────── */
const columns: Column<Registro>[] = [
  { label:'Nombre',     key:'nombre' },
  { label:'Ubicación',  key:'ubicacion' },
  { label:'Variedades', key:'variedades' },
  { label:'Hectáreas',  key:'hectareas', align:'center' },
  {
    label: 'Propietario', key: 'propietario',
    render: (h) => {
      const p = (h as any).propietario_detalle;
      if (!p) return '—';
      const isArch = p.archivado_en || !p.is_active;
      return (
        <Tooltip title={isArch ? 'Propietario archivado' : 'Propietario activo'} arrow>
          <span>
            <Chip
              label={`${p.nombre} ${p.apellidos}`}
              size="small"
              color={isArch ? 'warning' : 'success'}
              sx={{ fontWeight: 500, fontSize: 13, height: 24 }}
            />
          </span>
        </Tooltip>
      );
    },
  },
  {
    label:'Tipo', key:'tipo',
    render:(h)=>
      h.tipo==='rentada'
        ? <Chip label="Rentada" size="small" color="info"   />
        : <Chip label="Propia"  size="small" color="success"/>
  },
  {
    label:'Monto renta', key:'monto_renta', align:'right',
    render:(h)=>
      h.tipo==='rentada'
        ? `$ ${h.monto_renta.toLocaleString('es-MX',{minimumFractionDigits:2})}`
        : '—'
  },
{
  label: 'Estado', key: 'archivado_en', align: 'center',
  render: (h) =>
    h.archivado_en
      ? <Chip label="Archivada" size="small" color="warning" />
      : <Chip label="Activa"    size="small" color="success" />
}
,
];

/* ───────── Props ───────── */
interface Props {
  data: Registro[];
  page: number;
  pageSize: number;
  count: number;
  onPageChange:(n:number)=>void;

  onEdit:    (h:Registro)=>void;
  onArchive: (h:Registro)=>void;
  onRestore: (h:Registro)=>void;
  onDelete:  (h:Registro)=>void;
  onTemporadas?:(h:Registro)=>void;

  loading?: boolean;
  emptyMessage: string;

  filterConfig?:FilterConfig[];
  filterValues?:Record<string,any>;
  onFilterChange?:(f:Record<string,any>)=>void;
  limpiarFiltros?:()=>void;
}

const HuertaTable:React.FC<Props>=({
  data, page, pageSize, count, onPageChange,
  onEdit,onArchive,onRestore,onDelete,onTemporadas,
  loading=false, emptyMessage,
  filterConfig=[], filterValues, onFilterChange, limpiarFiltros
})=>(
  <TableLayout<Registro>
    data={data}
    page={page}
    pageSize={pageSize}
    count={count}
    onPageChange={onPageChange}
    columns={columns}
    serverSidePagination
    loading={loading}
    emptyMessage={emptyMessage}
    striped dense
    filterConfig={filterConfig}
    filterValues={filterValues}
    onFilterChange={onFilterChange}
    applyFiltersInternally={false}
    extraFilterElement={limpiarFiltros && (
      <Button variant="contained" color="secondary"
        onClick={limpiarFiltros} sx={{height:40}}>
        Limpiar filtros
      </Button>
    )}
    renderActions={(h)=>(      <ActionsMenu
        isArchived={!h.is_active}
        onEdit={!h.is_active ? undefined : ()=>onEdit(h)}
        onArchiveOrRestore={()=>(!h.is_active ? onRestore(h) : onArchive(h))}
        onDelete={()=>onDelete(h)}
        onTemporadas={!h.is_active || !onTemporadas ? undefined : ()=>onTemporadas(h)}
      />
    )}
  />
);

export default HuertaTable;
