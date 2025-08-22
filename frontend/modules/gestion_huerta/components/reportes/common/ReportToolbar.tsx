// frontend/modules/gestion_huerta/components/reportes/common/ReportToolbar.tsx
import React, { useState } from 'react';
import { Box, Button, MenuItem, TextField } from '@mui/material';

interface Props {
  onFetch: (tipo: 'cosecha' | 'temporada' | 'huerta', id: number) => void;
}

const ReportToolbar: React.FC<Props> = ({ onFetch }) => {
  const [tipo, setTipo] = useState<'cosecha' | 'temporada' | 'huerta'>('cosecha');
  const [id, setId] = useState('');

  const handleSubmit = () => {
    const num = parseInt(id, 10);
    if (!Number.isNaN(num)) {
      onFetch(tipo, num);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField
        select
        label="Tipo"
        value={tipo}
        onChange={(e) => setTipo(e.target.value as any)}
        size="small"
      >
        <MenuItem value="cosecha">Cosecha</MenuItem>
        <MenuItem value="temporada">Temporada</MenuItem>
        <MenuItem value="huerta">Huerta</MenuItem>
      </TextField>
      <TextField
        label="ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
        size="small"
        type="number"
      />
      <Button variant="contained" onClick={handleSubmit} sx={{ alignSelf: 'center' }}>
        Generar
      </Button>
    </Box>
  );
};

export default ReportToolbar;

