import { Box, Typography } from '@mui/material';
import InventariosTabs from '../components/inventarios/InventariosTabs';
import { useAppSelector } from '../../../global/store/store';

export default function Inventarios() {
  const { bodegaId, temporadaId } = useAppSelector((s) => s.tableroBodega);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Inventarios
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Consulta las cajas disponibles en almacén. Las cajas de madera se descuentan automáticamente mediante operaciones FIFO al clasificar.
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
        <InventariosTabs bodegaId={bodegaId ?? undefined} temporadaId={temporadaId ?? undefined} />
      </Box>
    </Box>
  );
}
