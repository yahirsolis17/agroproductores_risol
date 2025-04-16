import React from 'react';
import { Button, Box } from '@mui/material';
import { Add } from '@mui/icons-material';

interface HuertaToolbarProps {
  onOpen: () => void;
}

const HuertaToolbar: React.FC<HuertaToolbarProps> = ({ onOpen }) => {
  return (
    <Box display="flex" justifyContent="flex-end" mb={2}>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={onOpen}
        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 500 }}
      >
        Nueva Huerta
      </Button>
    </Box>
  );
};

export default HuertaToolbar;
