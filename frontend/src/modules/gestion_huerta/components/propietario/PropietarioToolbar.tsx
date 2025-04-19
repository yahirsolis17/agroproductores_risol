import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import PropietarioFormModal from './PropietarioFormModal';
import { PropietarioCreateData } from '../../types/propietarioTypes';

interface PropietarioToolbarProps {
  onCreate: (payload: PropietarioCreateData) => Promise<void>;
}

const PropietarioToolbar: React.FC<PropietarioToolbarProps> = ({ onCreate }) => {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (values: PropietarioCreateData) => {
    try {
      const nuevo = await onCreate(values);
      setOpen(false); // ✅ solo cerrar si todo fue bien
      return nuevo;   // 🔁 necesario si usas `onSuccess`
    } catch (error) {
      // No cerrar el modal, deja que Formik se encargue
      throw error; // 🔁 esto es lo que Formik necesita
    }
  };
  

  return (
    <Box display="flex" justifyContent="flex-end" mb={2}>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => setOpen(true)}
        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 500 }}
      >
        Nuevo Propietario
      </Button>
      <PropietarioFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default PropietarioToolbar;
