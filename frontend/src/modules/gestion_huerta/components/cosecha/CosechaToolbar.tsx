// src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx
import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import CosechaFormModal from './CosechaFormModal';
import { CosechaCreateData } from '../../types/cosechaTypes';

interface CosechaToolbarProps {
  onCreate: (payload: CosechaCreateData) => Promise<void>;
}

const CosechaToolbar: React.FC<CosechaToolbarProps> = ({ onCreate }) => {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (values: CosechaCreateData) => {
    await onCreate(values);
  };

  return (
    <div className="mb-4">
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => setOpen(true)}
      >
        Nueva Cosecha
      </Button>

      <CosechaFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default CosechaToolbar;
