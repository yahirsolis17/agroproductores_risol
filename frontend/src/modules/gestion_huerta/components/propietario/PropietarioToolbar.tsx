// src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import PropietarioFormModal from './PropietarioFormModal';
import { PropietarioCreateData } from '../../types/propietarioTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton'; // ← Import

interface PropietarioToolbarProps {
  onCreate: (payload: PropietarioCreateData) => Promise<void>;
}

const PropietarioToolbar: React.FC<PropietarioToolbarProps> = ({ onCreate }) => {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (values: PropietarioCreateData) => {
    const nuevo = await onCreate(values);
    setOpen(false);
    return nuevo;
  };

  return (
    <Box display="flex" justifyContent="flex-end" mb={2}>
      <PermissionButton
        perm="add_propietario"
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => setOpen(true)}
      >
        Nuevo Propietario
      </PermissionButton>
      <PropietarioFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default PropietarioToolbar;
