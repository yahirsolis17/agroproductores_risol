// frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx
import { useEffect, useRef, useState } from 'react';
import { Box, Stack, TextField, MenuItem, Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { PermissionButton } from '../../../../components/common/PermissionButton';
import IsoWeekPicker from '../common/IsoWeekPicker';
import WeekSwitcher from '../common/WeekSwitcher';
import TipoMangoAutocomplete from '../common/TipoMangoAutocomplete';

type Props = {
  // contexto
  bodegaId?: number;
  temporadaId?: number;

  // filtros controlados
  search?: string;
  tipo_mango?: string;
  estado?: 'activas'|'archivadas'|'todas';
  fecha_gte?: string;
  fecha_lte?: string;

  // handlers de filtros
  onSearchChange: (v: string) => void;
  onTipoMangoChange: (v?: string) => void;
  onEstadoChange: (v: 'activas'|'archivadas'|'todas') => void;
  onRangeChange: (from?: string, to?: string) => void;
  onClear: () => void;

  // acciones
  onNewRecepcion: () => void;
  onFastCapture?: () => void;

  // flags UI
  busy?: boolean;
  disabledActions?: boolean; // semana cerrada / temporada finalizada
  disabledReason?: string;
};

export default function CapturasToolbar(props: Props) {
  const {
    bodegaId, temporadaId,
    search, tipo_mango, estado = 'activas', fecha_gte, fecha_lte,
    onSearchChange, onTipoMangoChange, onEstadoChange, onRangeChange, onClear,
    onNewRecepcion, onFastCapture,
    busy = false, disabledActions = false, disabledReason,
  } = props;

  // debounce para search
  const [q, setQ] = useState(search ?? '');
  const tRef = useRef<number | null>(null);
  useEffect(() => { setQ(search ?? ''); }, [search]);
  useEffect(() => () => { if (tRef.current) window.clearTimeout(tRef.current); }, []);
  const changeQ = (v: string) => {
    setQ(v);
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => onSearchChange(v), 300);
  };

  const canAct = !busy && !disabledActions && !!bodegaId && !!temporadaId;

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
      <TextField
        size="small"
        label="Buscar"
        placeholder="Huertero, notas..."
        value={q}
        onChange={(e) => changeQ(e.target.value)}
      />

      <Box sx={{ minWidth: 220 }}>
        <TipoMangoAutocomplete value={tipo_mango ?? ''} onChange={onTipoMangoChange} />
      </Box>

      <TextField
        select
        size="small"
        label="Estado"
        value={estado}
        onChange={(e) => onEstadoChange(e.target.value as any)}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="activas">Activas</MenuItem>
        <MenuItem value="archivadas">Archivadas</MenuItem>
        <MenuItem value="todas">Todas</MenuItem>
      </TextField>

      <IsoWeekPicker
        value={{ from: fecha_gte, to: fecha_lte }}
        onChange={(r: { from?: string; to?: string }) => onRangeChange(r.from, r.to)}
      />
      <WeekSwitcher
        value={{ from: fecha_gte, to: fecha_lte }}
        onChange={(r: { from?: string; to?: string }) => onRangeChange(r.from, r.to)}
      />

      <Button variant="outlined" color="secondary" onClick={onClear}>Limpiar</Button>

      <Box sx={{ flex: 1 }} />

      {onFastCapture && (
        <Tooltip title={!canAct ? (disabledReason || 'Operación no disponible') : ''} disableHoverListener={canAct}>
          <span>
            <PermissionButton
              perm="add_recepcion"
              variant="outlined"
              disabled={!canAct}
              onClick={onFastCapture}
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
          >
            Nueva recepción
          </PermissionButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
