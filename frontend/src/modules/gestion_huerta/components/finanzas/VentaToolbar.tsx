import React, { useMemo } from 'react';
import {
  Box, TextField, Button, InputAdornment,
  Tooltip, Chip, Tabs, Tab, Paper
} from '@mui/material';
import { Add as AddIcon, Clear as ClearIcon } from '@mui/icons-material';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Filters {
  estado?: 'activas' | 'archivadas' | 'todas';
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
}

const VentaToolbar: React.FC<Props> = ({
  filters, onFiltersChange,
  onCreateClick, canCreate = true, createTooltip,
  totalCount, activeFiltersCount, onClearFilters,
}) => {
  // Tabs de estado
  const estadoValue = filters.estado ?? 'activas';
  const handleEstadoChange = (_: any, val: 'activas'|'archivadas'|'todas') => {
    if (!val) return;
    onFiltersChange({ ...filters, estado: val });
  };

  /* ------------------------ etiqueta total registros ------------------------ */
  const totalLabel = useMemo(() => (
    `${totalCount} venta${totalCount !== 1 ? 's' : ''} encontrada${totalCount !== 1 ? 's' : ''}`
  ), [totalCount]);

  /* --------------------------- Fechas (filtros) ----------------------------- */
  const handleDate = (field: 'fechaDesde' | 'fechaHasta', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

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

      {/* --------- FILA SUPERIOR: Botón crear --------- */}
      {onCreateClick && (
        <Box display="flex" justifyContent="flex-end" sx={{ mb: 1.5 }}>
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
        </Box>
      )}

      {/* -------- Bloque de filtros (solo fechas) -------- */}
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

        {/* Acciones de filtros */}
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
    </Paper>
  );
};

export default VentaToolbar;
