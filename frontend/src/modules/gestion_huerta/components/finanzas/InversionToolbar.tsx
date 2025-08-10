// src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx
import React, { useMemo, useState } from 'react';
import {
  Box, TextField, Button, InputAdornment,
  Tooltip, Chip, CircularProgress, Tabs, Tab, Paper
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
  ...((theme as any).applyStyles?.('dark', {
    backgroundColor: darken(theme.palette.primary.main, 0.8),
  }) || {}),
}));
const GroupItems = styled('ul')({ padding: 0 });

/* ---------- Tipo de opción del Autocomplete ---------- */
type Opt = { id: number | 'new' | 'all'; label: string; firstLetter?: string };

/* ---------- Filtro tipado correctamente a Opt ---------- */
const filter = createFilterOptions<Opt>();

/* ---------- Type guards ---------- */
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

  // Tabs de estado
  const estadoValue = filters.estado ?? 'activas';
  const handleEstadoChange = (_: any, val: 'activas'|'archivadas'|'todas') => {
    if (!val) return;
    onFiltersChange({ ...filters, estado: val });
  };

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
  const totalLabel = `${totalCount} inversión${totalCount !== 1 ? 'es' : ''} encontrada${totalCount !== 1 ? 's' : ''}`;

  /* --------------------------- Fechas (filtros) ----------------------------- */
  const handleDate = (field: 'fechaDesde' | 'fechaHasta', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  /* --------------------- Valor seleccionado para categoría ------------------ */
  const selectedCat: Opt | null = useMemo(() => {
    if (filters.categoria == null) return options.find(o => o.id === 'all') || null;
    const found = options.find(o => typeof o.id === 'number' && o.id === filters.categoria);
    return found || null;
  }, [filters.categoria, options]);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        border: theme => `1px solid ${theme.palette.divider}`,
        transition: 'opacity .15s ease',
      }}
    >
      {/* -------- Tabs de estado -------- */}
      <Tabs
        value={estadoValue}
        onChange={handleEstadoChange}
        textColor="primary"
        indicatorColor="primary"
        sx={{
          mb: 1.5,
          minHeight: 36,
          '& .MuiTab-root': { textTransform: 'none', minHeight: 36, fontWeight: 600 },
        }}
      >
        <Tab value="activas" label="Activas" />
        <Tab value="archivadas" label="Archivadas" />
        <Tab value="todas" label="Todas" />
      </Tabs>

      {/* --------- FILA SUPERIOR: Botón crear (separado de los filtros) --------- */}
      {onCreateClick && (
        <Box display="flex" justifyContent="flex-end" sx={{ mb: 1.5 }}>
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
        </Box>
      )}

      {/* -------- Bloque de filtros -------- */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        columnGap={2.5}
        rowGap={2}
        alignItems="center"
        sx={{ mt: 1 }}
      >
        {/* Fecha Desde */}
        <TextField
          size="small"
          label="Desde"
          type="date"
          value={filters.fechaDesde ?? ''}
          onChange={e => handleDate('fechaDesde', e.target.value)}
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
          size="small"
          label="Hasta"
          type="date"
          value={filters.fechaHasta ?? ''}
          onChange={e => handleDate('fechaHasta', e.target.value)}
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

        {/* Categoría */}
        <Autocomplete<Opt>
          size="small"
          options={options}
          value={selectedCat}
          loading={categoriesLoading}
          inputValue={catInput}
          onInputChange={(_, v) => setCatInput(v)}
          groupBy={(opt) => (typeof opt.id === 'number' ? (opt.firstLetter || '') : '')}
          filterOptions={(opts: Opt[], params: FilterOptionsState<Opt>): Opt[] => {
            const cats = opts.filter(isCat);
            const fixed = opts.filter(isFixedOpt);
            const filteredCats = filter(cats, params).sort((a,b)=>a.label.localeCompare(b.label, 'es'));
            return [...fixed, ...filteredCats];
          }}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(o,v) => o.id === v.id}
          onChange={(_, opt) => {
            if (!opt) return;
            if (opt.id === 'new') { setOpenCatModal(true); return; }
            if (opt.id === 'all') { onFiltersChange({ ...filters, categoria: undefined }); return; }
            if (typeof opt.id === 'number') { onFiltersChange({ ...filters, categoria: opt.id }); }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Categoría"
              placeholder="Todas"
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

        {/* Acciones de filtros: solo mostrar “Limpiar filtros” si hay filtros activos */}
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ justifySelf: { xs: 'start', sm: 'end' } }}
        >
          {activeFiltersCount > 0 && (
            <Button
              size="small"
              onClick={onClearFilters}
              startIcon={<ClearIcon />}
              sx={{ textTransform: 'none' }}
            >
              Limpiar filtros
            </Button>
          )}
        </Box>
      </Box>

      {/* Pie: info y contador de filtros activos */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ mt: 2 }}
      >
        <span className="text-sm text-gray-600">{totalLabel}</span>
        {activeFiltersCount > 0 && (
          <Chip
            label={`${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''} activo${activeFiltersCount !== 1 ? 's' : ''}`}
            size="small" color="primary" variant="outlined"
          />
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
    </Paper>
  );
};

export default InversionToolbar;
