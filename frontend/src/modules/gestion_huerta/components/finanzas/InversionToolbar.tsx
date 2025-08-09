// src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx
import React, { useMemo, useState } from 'react';
import {
  Box, TextField, Button, InputAdornment,
  Tooltip, Chip, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Clear as ClearIcon } from '@mui/icons-material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import type { FilterOptionsState } from '@mui/material/useAutocomplete';
import { styled, lighten, darken } from '@mui/system';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import CategoriaInversionFormModal from './CategoriaFormModal';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';

interface Filters {
  estado?: 'activas' | 'archivadas' | 'todas';
  categoria?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;

  onCreateClick?: () => void;
  canCreate?: boolean;
  createTooltip?: string;

  totalCount: number;
  activeFiltersCount: number;
  onClearFilters: () => void;

  // lista completa de categorías ya cargada por el padre
  categoriesOptions: { id:number; nombre:string; is_active:boolean }[];
  categoriesLoading?: boolean;
  onCategoryCreated?: (cat: CategoriaInversion)=>void;
}

/* ---------- UI para agrupación por letra ---------- */
const GroupHeader = styled('div')(({ theme }) => ({
  position: 'sticky',
  top: '-8px',
  padding: '4px 10px',
  color: theme.palette.primary.main,
  backgroundColor: lighten(theme.palette.primary.light, 0.85),
  // opcional si tu theme no define applyStyles
  ...((theme as any).applyStyles?.('dark', {
    backgroundColor: darken(theme.palette.primary.main, 0.8),
  }) || {}),
}));
const GroupItems = styled('ul')({ padding: 0 });

/* ---------- Tipo de opción del Autocomplete ---------- */
type Opt = { id: number | 'new' | 'all'; label: string; firstLetter?: string };

/* ---------- Filtro tipado correctamente a Opt ---------- */
const filter = createFilterOptions<Opt>();

/* ---------- Type guards para separar opciones ---------- */
const isCat = (o: Opt): o is Extract<Opt, { id: number }> => typeof o.id === 'number';
const isFixedOpt = (o: Opt): o is Extract<Opt, { id: 'new' | 'all' }> => o.id === 'new' || o.id === 'all';

const InversionToolbar: React.FC<Props> = ({
  filters, onFiltersChange,
  onCreateClick, canCreate = true, createTooltip,
  totalCount, activeFiltersCount, onClearFilters,
  categoriesOptions, categoriesLoading = false,
  onCategoryCreated,
}) => {
  const [openCatModal, setOpenCatModal] = useState(false);
  const [catInput, setCatInput] = useState('');

  /* --------- Opciones del Autocomplete (orden alfabético + grupos) --------- */
  const options: Opt[] = useMemo(() => {
    const cats: Opt[] = (categoriesOptions || [])
      .map(c => ({
        id: c.id,
        label: c.nombre,
        firstLetter: (c.nombre?.[0] || '')
          .toUpperCase()
          .match(/[0-9]/) ? '0-9' : (c.nombre?.[0] || '').toUpperCase()
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    const newOpt: Opt = { id: 'new', label: 'Registrar categoría…' };
    const allOpt: Opt = { id: 'all', label: 'Todas' };

    return [newOpt, allOpt, ...cats];
  }, [categoriesOptions]);

  /* ------------------------ etiqueta total registros ------------------------ */
  const totalLabel = useMemo(
    () => `${totalCount} inversión${totalCount !== 1 ? 'es' : ''} encontrada${totalCount !== 1 ? 's' : ''}`,
    [totalCount]
  );

  /* --------------------------- Fechas (filtros) ----------------------------- */
  const handleDate = (field: 'fechaDesde' | 'fechaHasta', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  /* ----------------------------- Estado (tabs) ------------------------------ */
  const setEstado = (val: 'activas'|'archivadas'|'todas') => {
    onFiltersChange({ ...filters, estado: val });
  };

  /* --------------------- Valor seleccionado para categoría ------------------ */
  const selectedCat: Opt | null = useMemo(() => {
    if (filters.categoria == null) return options.find(o => o.id === 'all') || null;
    const found = options.find(o => typeof o.id === 'number' && o.id === filters.categoria);
    return found || null;
  }, [filters.categoria, options]);

  /* -------------------------------- Render --------------------------------- */
  return (
    <Box mb={6}>
      {/* Tabs de estado (backend-driven) */}
      <Box display="flex" gap={1} mb={1} flexWrap="wrap">
        <Button
          size="small" variant={filters.estado === 'activas' || !filters.estado ? 'contained' : 'outlined'}
          onClick={() => setEstado('activas')}
        >Activas</Button>
        <Button
          size="small" variant={filters.estado === 'archivadas' ? 'contained' : 'outlined'}
          onClick={() => setEstado('archivadas')}
        >Archivadas</Button>
        <Button
          size="small" variant={filters.estado === 'todas' ? 'contained' : 'outlined'}
          onClick={() => setEstado('todas')}
        >Todas</Button>
      </Box>

      {/* Línea principal de filtros + botón crear */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">

        {/* Fecha Desde */}
        <TextField
          size="small" label="Desde" type="date" sx={{ width: 150 }}
          value={filters.fechaDesde ?? ''} onChange={e => handleDate('fechaDesde', e.target.value)}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: filters.fechaDesde && (
              <InputAdornment position="end">
                <Button size="small" onClick={() => handleDate('fechaDesde', '')} sx={{ minWidth: 'auto', p: 0.5 }}>
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Fecha Hasta */}
        <TextField
          size="small" label="Hasta" type="date" sx={{ width: 150 }}
          value={filters.fechaHasta ?? ''} onChange={e => handleDate('fechaHasta', e.target.value)}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: filters.fechaHasta && (
              <InputAdornment position="end">
                <Button size="small" onClick={() => handleDate('fechaHasta', '')} sx={{ minWidth: 'auto', p: 0.5 }}>
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Categoría (orden alfabético con grupos + opción Registrar arriba) */}
        <Autocomplete<Opt>
          size="small"
          sx={{ width: 320 }}
          options={options}
          value={selectedCat}
          loading={categoriesLoading}
          inputValue={catInput}
          onInputChange={(_, v) => setCatInput(v)}
          groupBy={(opt) => (typeof opt.id === 'number' ? (opt.firstLetter || '') : '')}
          filterOptions={(opts: Opt[], params: FilterOptionsState<Opt>): Opt[] => {
            // Usamos el filtro de MUI SOLO para las categorías (id numérico),
            // y luego anteponemos las opciones fijas ('new' y 'all')
            const cats = opts.filter(isCat);
            const fixed = opts.filter(isFixedOpt);
            const filteredCats = filter(cats, params)
              .sort((a,b)=>a.label.localeCompare(b.label, 'es'));
            return [...fixed, ...filteredCats];
          }}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(o,v) => o.id === v.id}
          onChange={(_, opt) => {
            if (!opt) return;
            if (opt.id === 'new') {
              setOpenCatModal(true);
              return;
            }
            if (opt.id === 'all') {
              onFiltersChange({ ...filters, categoria: undefined });
              return;
            }
            if (typeof opt.id === 'number') {
              onFiltersChange({ ...filters, categoria: opt.id });
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Categoría (todas ordenadas)"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {categoriesLoading && <CircularProgress size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderGroup={(params) => (
            <li key={params.key}>
              <GroupHeader>{params.group}</GroupHeader>
              <GroupItems>{params.children}</GroupItems>
            </li>
          )}
        />

        {/* Botón Nueva inversión */}
        {onCreateClick && (
          <Tooltip title={createTooltip || ''}>
            <span>
              <PermissionButton
                perm="add_inversion"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateClick}
                disabled={!canCreate}
              >
                Nueva Inversión
              </PermissionButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Línea info & filtros activos */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <span className="text-sm text-gray-600">{totalLabel}</span>
        {activeFiltersCount > 0 && (
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''} activo${activeFiltersCount !== 1 ? 's' : ''}`}
              size="small" color="primary" variant="outlined"
            />
            <Button size="small" onClick={onClearFilters} startIcon={<ClearIcon />} sx={{ textTransform: 'none' }}>
              Limpiar filtros
            </Button>
          </Box>
        )}
      </Box>

      {/* Modal anidado para crear categoría desde el filtro */}
      <CategoriaInversionFormModal
        open={openCatModal}
        onClose={() => setOpenCatModal(false)}
        onSuccess={(nueva) => {
          setOpenCatModal(false);
          onCategoryCreated?.(nueva);
          onFiltersChange({ ...filters, categoria: nueva.id });
        }}
      />
    </Box>
  );
};

export default InversionToolbar;
