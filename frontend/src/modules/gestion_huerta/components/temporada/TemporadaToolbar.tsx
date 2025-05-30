// src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx

import React from 'react';
import { Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Props {
  onOpen: () => void;
}

/**
 * Toolbar para acciones de Temporadas.
 * Muestra el botón "Nueva Temporada" con permiso 'add_temporada'.
 */
const TemporadaToolbar: React.FC<Props> = ({ onOpen }) => (
  <Box display="flex" justifyContent="flex-end" mb={2}>
    <PermissionButton
      perm="add_temporada"
      variant="contained"
      color="primary"
      startIcon={<Add />}
      onClick={onOpen}
    >
      Nueva Temporada
    </PermissionButton>
  </Box>
);

export default TemporadaToolbar;
