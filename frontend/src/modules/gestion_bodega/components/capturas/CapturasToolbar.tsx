// frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx
import { useEffect, useRef } from 'react';
import { Box, Stack } from '@mui/material';
import { Add, FlashOn } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { PermissionButton } from '../../../../components/common/PermissionButton';

type Props = {
  bodegaId?: number;
  temporadaId?: number;
  onNewRecepcion: () => void;
  onFastCapture?: () => void;
  busy?: boolean;
  disabledActions?: boolean;
  disabledReason?: string;
};

const CapturasToolbar = ({
  bodegaId,
  temporadaId,
  onNewRecepcion,
  onFastCapture,
  busy = false,
  disabledActions = false,
  disabledReason,
}: Props) => {
  const tRef = useRef<number | null>(null);
  useEffect(() => () => { if (tRef.current) window.clearTimeout(tRef.current); }, []);

  const canAct = !busy && !disabledActions && !!bodegaId && !!temporadaId;

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1 }} />

      {onFastCapture && (
        <Tooltip title={!canAct ? (disabledReason || 'Operación no disponible') : ''} disableHoverListener={canAct}>
          <span>
            <PermissionButton
              perm="add_recepcion"
              variant="outlined"
              disabled={!canAct}
              onClick={onFastCapture}
              startIcon={<FlashOn />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
            >
              Captura rápida
            </PermissionButton>
          </span>
        </Tooltip>
      )}

      <Tooltip title={!canAct ? (disabledReason || 'Operación no disponible') : ''} disableHoverListener={canAct}>
        <span>
          <PermissionButton
            perm="add_recepcion"
            variant="contained"
            disabled={!canAct}
            onClick={onNewRecepcion}
            startIcon={<Add />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
          >
            Nueva recepción
          </PermissionButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

export default CapturasToolbar;

