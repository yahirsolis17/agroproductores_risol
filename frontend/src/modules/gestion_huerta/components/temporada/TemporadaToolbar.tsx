// src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface TemporadaToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  yearFilter: number | null;
  onYearChange: (year: number | null) => void;
  finalizadaFilter: boolean | null;
  onFinalizadaChange: (finalizada: boolean | null) => void;
  onCreateClick?: () => void;
  canCreate?: boolean;
  createTooltip?: string;
  totalCount: number;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const TemporadaToolbar: React.FC<TemporadaToolbarProps> = ({
  searchValue,
  onSearchChange,
  yearFilter,
  onYearChange,
  finalizadaFilter,
  onFinalizadaChange,
  onCreateClick,
  canCreate = true,
  createTooltip,
  totalCount,
  activeFiltersCount,
  onClearFilters,
}) => {
  const [yearInput, setYearInput] = useState<string>(yearFilter?.toString() || '');

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setYearInput(value);
    
    if (value === '') {
      onYearChange(null);
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 2000 && num <= 2100) {
        onYearChange(num);
      }
    }
  };

  const clearYearFilter = () => {
    setYearInput('');
    onYearChange(null);
  };

  const currentYear = new Date().getFullYear();

  return (
    <Box className="mb-6">
      {/* Barra de búsqueda y filtros */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        {/* Búsqueda */}
        <TextField
          size="small"
          placeholder="Buscar por año, huerta o propietario..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => onSearchChange('')}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300, flexGrow: 1 }}
        />

        {/* Filtro por año */}
        <TextField
          size="small"
          label="Año"
          type="number"
          value={yearInput}
          onChange={handleYearInputChange}
          inputProps={{
            min: 2000,
            max: currentYear + 1,
          }}
          sx={{ width: 120 }}
          InputProps={{
            endAdornment: yearInput && (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={clearYearFilter}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
        />

        {/* Filtro por estado de finalización */}
        <TextField
          size="small"
          select
          label="Estado"
          value={finalizadaFilter === null ? '' : finalizadaFilter.toString()}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              onFinalizadaChange(null);
            } else {
              onFinalizadaChange(value === 'true');
            }
          }}
          sx={{ width: 140 }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="false">En curso</MenuItem>
          <MenuItem value="true">Finalizadas</MenuItem>
        </TextField>

        {/* Botón crear temporada */}
        {onCreateClick && (
          <Tooltip title={createTooltip || ''}>
            <span>
              <PermissionButton
                perm="add_temporada"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateClick}
                disabled={!canCreate}
              >
                Nueva Temporada
              </PermissionButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Información y filtros activos */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <span className="text-sm text-gray-600">
            {totalCount} temporada{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}
          </span>
          
          {activeFiltersCount > 0 && (
            <>
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
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TemporadaToolbar;
