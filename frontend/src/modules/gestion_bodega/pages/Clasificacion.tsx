import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Stack, Typography, Button, Divider } from '@mui/material';
import { formatDateDisplay, parseLocalDateStrict } from '../../../global/utils/date';
import { getCaptura } from '../services/capturasService';
import type { Captura } from '../types/capturasTypes';

export default function ClasificacionPage() {
  const { bodegaId, recepcionId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = React.useState<Captura | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const id = Number(recepcionId);
        if (!id || isNaN(id)) return;
        const { captura } = await getCaptura(id);
        if (!cancelled) setItem(captura);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recepcionId]);

  const goBack = () => navigate(-1);

  const fecha = item?.fecha ? formatDateDisplay(parseLocalDateStrict(item.fecha)) : '-';

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Clasificación — Recepción #{recepcionId}</Typography>
          <Button onClick={goBack} variant="outlined">Volver</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Bodega #{bodegaId}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {loading ? (
          <Typography>Cargando recepción…</Typography>
        ) : item ? (
          <>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body1">Fecha: <b>{fecha}</b></Typography>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body1">Tipo: <b>{item.tipo_mango}</b></Typography>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body1">Cajas: <b>{item.cantidad_cajas}</b></Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">(UI de clasificación pendiente — Fase siguiente)</Typography>
          </>
        ) : (
          <Typography>No se encontró la recepción solicitada.</Typography>
        )}
      </Paper>
    </Box>
  );
}
