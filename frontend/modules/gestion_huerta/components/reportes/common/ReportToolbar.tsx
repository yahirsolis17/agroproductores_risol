// frontend/modules/gestion_huerta/components/reportes/common/ReportToolbar.tsx
import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField } from '@mui/material';

interface Props {
  onFetch: (tipo: 'cosecha' | 'temporada' | 'huerta', id: number) => void;
  initialTipo?: 'cosecha' | 'temporada' | 'huerta';
  initialId?: number;
}

const ReportToolbar: React.FC<Props> = ({ onFetch, initialTipo, initialId }) => {
  const [tipo, setTipo] = useState<'cosecha' | 'temporada' | 'huerta'>(initialTipo ?? 'cosecha');
  const [id, setId] = useState(initialId ? String(initialId) : '');

  useEffect(() => {
    if (initialTipo) setTipo(initialTipo);
    if (initialId !== undefined) setId(String(initialId));
  }, [initialTipo, initialId]);

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

