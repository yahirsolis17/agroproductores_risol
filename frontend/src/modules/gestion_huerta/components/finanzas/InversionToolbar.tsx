// src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx
import React, { useState, useMemo } from 'react';
import {
  Box, TextField, Button, InputAdornment,
  Tooltip, Chip, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';

import { categoriaInversionService } from '../../services/categoriaInversionService';
import { PermissionButton }          from '../../../../components/common/PermissionButton';

interface Filters {
  categoria?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;

  /* Alta rápida */
  onCreateClick?: () => void;
  canCreate?: boolean;
  createTooltip?: string;

  totalCount: number;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

type CatOption =
  | { id: 'none'; label: 'Todas'; value: number | null }
  | { id: number; label: string; value: number };

const InversionToolbar: React.FC<Props> = ({
  filters, onFiltersChange,
  onCreateClick, canCreate = true, createTooltip,
  totalCount, activeFiltersCount, onClearFilters,
}) => {
  /* ─────── Categorías (autocomplete) ─────── */
  const [catLoading, setCatLoading] = useState(false);
  const [catOptions, setCatOptions] = useState<CatOption[]>([]);
  const [catInput,   setCatInput]   = useState('');

  const fetchCategories = async (q: string) => {
    try {
      setCatLoading(true);
      const list = await categoriaInversionService.search(q);
      const opts: CatOption[] = list.map(c => ({
        id: c.id, label: c.nombre, value: c.id,
      }));
      setCatOptions([{ id: 'none', label: 'Todas', value: null }, ...opts]);
    } finally {
      setCatLoading(false);
    }
  };

  /* ─────── Etiqueta total registros ─────── */
  const totalLabel = useMemo(() =>
    `${totalCount} inversión${totalCount !== 1 ? 'es' : ''} encontrada${totalCount !== 1 ? 's' : ''}`,
    [totalCount]
  );

  /* ─────── Helpers fecha → string ISO ─────── */
  const handleDate = (field: 'fechaDesde' | 'fechaHasta', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  return (
    <Box mb={6}>
      {/* Línea principal de filtros + botón crear */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        {/* Fecha Desde */}
        <TextField
          size="small"
          label="Desde"
          type="date"
          sx={{ width: 150 }}
          value={filters.fechaDesde ?? ''}
          onChange={e => handleDate('fechaDesde', e.target.value)}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: filters.fechaDesde && (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => handleDate('fechaDesde', '')}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
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
          sx={{ width: 150 }}
          value={filters.fechaHasta ?? ''}
          onChange={e => handleDate('fechaHasta', e.target.value)}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: filters.fechaHasta && (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => handleDate('fechaHasta', '')}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Categoría */}
        <Autocomplete
          size="small"
          sx={{ width: 260 }}
          options={catOptions}
          loading={catLoading}
          inputValue={catInput}
          clearOnBlur={false}
          onInputChange={(_, value, reason) => {
            setCatInput(value);
            if (reason === 'input' && value.trim().length >= 2) {
              fetchCategories(value);
            }
          }}
          noOptionsText={
            catInput.trim().length < 2
              ? 'Empieza a escribir…'
              : 'Sin resultados'
          }
          getOptionLabel={(opt: CatOption) => opt.label}
          isOptionEqualToValue={(o, v) => o.value === v.value}
          value={
            filters.categoria != null
              ? catOptions.find(o => o.value === filters.categoria) || null
              : catOptions[0] ?? null
          }
          onChange={(_, option) =>
            onFiltersChange({ ...filters, categoria: option?.value ?? undefined })
          }
          renderInput={params => (
            <TextField
              {...params}
              label="Categoría"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {catLoading && <CircularProgress size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
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
              size="small"
              color="primary"
              variant="outlined"
            />
            <Button
              size="small"
              onClick={onClearFilters}
              startIcon={<ClearIcon />}
              sx={{ textTransform: 'none' }}
            >
              Limpiar filtros
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default InversionToolbar;
