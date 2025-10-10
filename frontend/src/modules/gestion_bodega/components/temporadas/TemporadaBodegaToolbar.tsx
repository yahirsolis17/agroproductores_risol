import React, { useState } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
  Tooltip,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Clear as ClearIcon } from '@mui/icons-material';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Props {
  yearFilter: number | null;
  onYearChange: (year: number | null) => void;
  finalizadaFilter: boolean | null;
  onFinalizadaChange: (f: boolean | null) => void;

  onCreate?: () => void;
  canCreate?: boolean;
  createTooltip?: string;

  totalCount: number;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const TemporadaBodegaToolbar: React.FC<Props> = ({
  yearFilter,
  onYearChange,
  finalizadaFilter,
  onFinalizadaChange,
  onCreate,
  canCreate = true,
  createTooltip,
  totalCount,
  activeFiltersCount,
  onClearFilters,
}) => {
  const [yearInput, setYearInput] = useState<string>(yearFilter?.toString() || '');
  const currentYear = new Date().getFullYear();

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setYearInput(value);

    if (value === '') return onYearChange(null);
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 2000 && n <= currentYear + 1) onYearChange(n);
  };

  const clearYear = () => {
    setYearInput('');
    onYearChange(null);
  };

  return (
    <Box className="mb-6">
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        {/* Filtro por año (idéntico UX a huerta) */}
        <TextField
          size="small"
          label="Año"
          type="number"
          value={yearInput}
          onChange={handleYearInputChange}
          inputProps={{ min: 2000, max: currentYear + 1 }}
          sx={{ width: 140 }}
          InputProps={{
            endAdornment: yearInput && (
              <InputAdornment position="end">
                <Button size="small" onClick={clearYear} sx={{ minWidth: 'auto', p: 0.5 }}>
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Filtro estado (en curso / finalizadas) */}
        <TextField
          size="small"
          select
          label="Estado"
          value={finalizadaFilter === null ? '' : String(finalizadaFilter)}
          onChange={(e) => {
            const v = e.target.value;
            onFinalizadaChange(v === '' ? null : v === 'true');
          }}
          sx={{ width: 160 }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="false">En curso</MenuItem>
          <MenuItem value="true">Finalizadas</MenuItem>
        </TextField>

        {/* Crear temporada (un clic) */}
        {onCreate && (
          <Tooltip title={createTooltip || ''}>
            <span>
              <PermissionButton
                perm="add_temporadabodega"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreate}
                disabled={!canCreate}
              >
                Nueva Temporada
              </PermissionButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Info y limpiar filtros */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <span className="text-sm text-gray-600">
            {totalCount} temporada{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}.
          </span>

          {activeFiltersCount > 0 && (
            <>
              <Chip
                label={`${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''} activo${activeFiltersCount !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Button size="small" onClick={onClearFilters} startIcon={<ClearIcon />} sx={{ textTransform: 'none' }}>
                Limpiar filtros
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TemporadaBodegaToolbar;
