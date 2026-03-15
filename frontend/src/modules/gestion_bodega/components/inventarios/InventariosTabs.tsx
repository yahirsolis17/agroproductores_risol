// frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx
// Vista de Inventarios — sin tabs (ya no hay plástico), solo Madera
import React from 'react';
import { Box, Typography } from '@mui/material';
import InventarioMaderaTable from './InventarioMaderaTable';

interface Props {
  bodegaId?: number;
  temporadaId?: number;
}

const InventariosTabs: React.FC<Props> = ({ bodegaId, temporadaId }) => (
  <Box>
    <Box mb={2}>
      <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
        Inventario de Empaques
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.25}>
        Control de stock de cajas de madera
      </Typography>
    </Box>

    <InventarioMaderaTable bodegaId={bodegaId} temporadaId={temporadaId} />
  </Box>
);

export default InventariosTabs;
