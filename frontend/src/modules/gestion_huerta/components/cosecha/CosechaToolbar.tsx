import React from 'react';
import { Box, TextField, MenuItem, Button, InputAdornment, Chip, Tooltip } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Add as AddIcon } from '@mui/icons-material';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Props {
  searchValue: string;
  onSearchChange: (v: string) => void;
  finalizadaFilter: boolean | null;
  onFinalizadaChange: (v: boolean | null) => void;
  estadoFilter: 'activas' | 'archivadas' | 'todas';
  onEstadoChange: (v: 'activas'|'archivadas'|'todas') => void;

  onCreateClick?: () => void;
  canCreate?: boolean;
  createTooltip?: string;

  totalCount: number;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const CosechaToolbar: React.FC<Props> = ({
  searchValue,
  onSearchChange,
  finalizadaFilter,
  onFinalizadaChange,
  estadoFilter,
  onEstadoChange,
  onCreateClick,
  canCreate = true,
  createTooltip,
  totalCount,
  activeFiltersCount,
  onClearFilters,
}) => {
  return (
    <Box className="mb-6">
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar por nombre..."
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

        <TextField
          size="small"
          select
          label="Finalización"
          value={finalizadaFilter === null ? '' : String(finalizadaFilter)}
          onChange={(e) => onFinalizadaChange(e.target.value === '' ? null : e.target.value === 'true')}
          sx={{ width: 170 }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="false">En curso</MenuItem>
          <MenuItem value="true">Finalizadas</MenuItem>
        </TextField>

        <TextField
          size="small"
          select
          label="Archivo"
          value={estadoFilter}
          onChange={(e) => onEstadoChange(e.target.value as any)}
          sx={{ width: 170 }}
        >
          <MenuItem value="activas">Activas</MenuItem>
          <MenuItem value="archivadas">Archivadas</MenuItem>
          <MenuItem value="todas">Todas</MenuItem>
        </TextField>

        {onCreateClick && (
          <Tooltip title={createTooltip || ''}>
            <span>
              <PermissionButton
                perm="add_cosecha"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateClick}
                disabled={!canCreate}
              >
                Iniciar cosecha
              </PermissionButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <span className="text-sm text-gray-600">
            {totalCount} cosecha{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}
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

export default CosechaToolbar;
