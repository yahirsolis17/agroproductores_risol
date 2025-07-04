// src/modules/gestion_huerta/components/huerta/HuertaToolbar.tsx
import React from 'react';
import { Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface Props { onOpen: () => void; }

const HuertaToolbar: React.FC<Props> = ({ onOpen }) => (
  <Box display="flex" justifyContent="flex-end" mb={2}>
    <PermissionButton
      perm="add_huerta"
      variant="contained"
      color="primary"
      startIcon={<Add />}
      onClick={onOpen}
      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
    >
      Nueva Huerta
    </PermissionButton>
  </Box>
);

export default HuertaToolbar;
