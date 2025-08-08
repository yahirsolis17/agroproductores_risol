// src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx
import React, { useMemo } from 'react';
import {
  Box, TextField, Button, InputAdornment,
  Tooltip, Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Filters {
  tipoMango?: string;
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

const VentaToolbar: React.FC<Props> = ({
  filters, onFiltersChange,
  onCreateClick, canCreate = true, createTooltip,
  totalCount, activeFiltersCount, onClearFilters,
}) => {

  const totalLabel = useMemo(() =>
    `${totalCount} venta${totalCount !== 1 ? 's' : ''} encontrada${totalCount !== 1 ? 's' : ''}`,
    [totalCount]
  );

  /* Helper genérico para fechas ISO (YYYY-MM-DD) */
  const handleDate = (key: 'fechaDesde' | 'fechaHasta', value: string) =>
    onFiltersChange({ ...filters, [key]: value || undefined });

  return (
    <Box mb={6}>
      {/* Línea principal de filtros + botón crear */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        {/* Tipo de mango (texto libre) */}
        <TextField
          size="small"
          label="Tipo de mango"
          placeholder="Kent, Ataulfo…"
          sx={{ minWidth: 220 }}
          value={filters.tipoMango ?? ''}
          onChange={e =>
            onFiltersChange({ ...filters, tipoMango: e.target.value || undefined })
          }
          InputProps={{
            endAdornment: filters.tipoMango && (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => onFiltersChange({ ...filters, tipoMango: undefined })}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Desde */}
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

        {/* Hasta */}
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

        {/* Botón Nueva venta */}
        {onCreateClick && (
          <Tooltip title={createTooltip || ''}>
            <span>
              <PermissionButton
                perm="add_venta"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateClick}
                disabled={!canCreate}
              >
                Nueva Venta
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

export default VentaToolbar;
