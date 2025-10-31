import React, { useCallback, useMemo, useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { formatDateDisplay, formatDateISO, parseLocalDateStrict } from '../../../../global/utils/date';
import type { IsoWeekRange } from './IsoWeekPicker';

import {
  startOfISOWeek,
  endOfISOWeek,
  shiftISOWeek,
  dateToIsoKey,
  isoKeyToRange,
  prettyRange,
} from '../../hooks/useIsoWeek';

// Ampliamos el contrato de salida, PERO mantenemos compatibilidad:
// - Los llamadores antiguos que esperan sólo {from, to} siguen funcionando.
// - Enviamos además isoSemana y direction si el llamador lo aprovecha.
type OutRange = IsoWeekRange & { isoSemana?: string; direction?: 'prev' | 'next' | 'jump' };

interface WeekSwitcherProps {
  value: IsoWeekRange & { isoSemana?: string }; // puedes pasar isoSemana o sólo from/to
  onChange: (range: OutRange) => void;

  // Nuevos (opcionales): para controlar límites
  disablePrev?: boolean;
  disableNext?: boolean;

  // Mostrar popover para saltar por fecha
  showPicker?: boolean;
}

const WeekSwitcher: React.FC<WeekSwitcherProps> = ({
  value,
  onChange,
  disablePrev = false,
  disableNext = false,
  showPicker = true,
}) => {
  // Base de cálculo: preferimos isoSemana -> from -> to -> hoy
  const baseISOKey = value?.isoSemana;
  const baseDateStr = value?.from || value?.to || formatDateISO(new Date());
  const baseDate = parseLocalDateStrict(baseDateStr);

  const fromDate = startOfISOWeek(baseISOKey ? parseLocalDateStrict(isoKeyToRange(baseISOKey)!.from) : baseDate);
  const toDate = endOfISOWeek(baseISOKey ? parseLocalDateStrict(isoKeyToRange(baseISOKey)!.to) : baseDate);

  const label = useMemo(() => `${formatDateDisplay(fromDate)} – ${formatDateDisplay(toDate)}`, [fromDate, toDate]);
  const pretty = useMemo(() => prettyRange(formatDateISO(fromDate), formatDateISO(toDate)), [fromDate, toDate]);

  const go = useCallback(
    (delta: number) => {
      const nextBase = shiftISOWeek(fromDate, delta);
      const nextFrom = startOfISOWeek(nextBase);
      const nextTo = endOfISOWeek(nextBase);
      const isoSemana = dateToIsoKey(nextFrom);
      onChange({
        from: formatDateISO(nextFrom),
        to: formatDateISO(nextTo),
        isoSemana,
        direction: delta < 0 ? 'prev' : 'next',
      });
    },
    [fromDate, onChange]
  );

  // Atajos de teclado (← →) cuando el control tiene foco
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && !disablePrev) {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight' && !disableNext) {
        e.preventDefault();
        go(1);
      }
    },
    [disablePrev, disableNext, go]
  );

  // Popover para “saltar” de semana con un date picker simple
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (evt: React.MouseEvent<HTMLElement>) => setAnchorEl(evt.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const jumpTo = (dateStr: string) => {
    const d = parseLocalDateStrict(dateStr);
    if (Number.isNaN(d.getTime())) return;
    const s = startOfISOWeek(d);
    const e = endOfISOWeek(d);
    const isoSemana = dateToIsoKey(s);
    onChange({ from: formatDateISO(s), to: formatDateISO(e), isoSemana, direction: 'jump' });
    handleClose();
  };

  const today = () => jumpTo(formatDateISO(new Date()));

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      sx={{
        outline: 'none',
        '&:focus-visible': { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}33`, borderRadius: 1 },
      }}
    >
      <Tooltip title="Semana anterior">
        <span>
          <IconButton size="small" onClick={() => go(-1)} disabled={disablePrev} aria-label="Semana anterior">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Etiqueta central, clickeable para abrir el date picker (opcional) */}
      <Tooltip title={pretty}>
        <Typography
          variant="body2"
          color="text.secondary"
          onClick={showPicker ? handleOpen : undefined}
          sx={{
            cursor: showPicker ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          {label}
        </Typography>
      </Tooltip>

      <Tooltip title="Siguiente semana">
        <span>
          <IconButton size="small" onClick={() => go(1)} disabled={disableNext} aria-label="Siguiente semana">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Popover interno (sin crear archivos nuevos) */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { p: 1.5, minWidth: 260 } }}
      >
        <Box display="flex" flexDirection="column" gap={1}>
          <TextField
            type="date"
            size="small"
            label="Ir a fecha"
            InputLabelProps={{ shrink: true }}
            value={formatDateISO(fromDate)}
            onChange={(e) => jumpTo(e.target.value)}
          />
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {pretty}
            </Typography>
            <Box display="flex" gap={1}>
              <Button size="small" variant="text" onClick={today}>
                Hoy
              </Button>
              <Button size="small" variant="text" onClick={handleClose}>
                Cerrar
              </Button>
            </Box>
          </Box>
        </Box>
      </Popover>
    </Stack>
  );
};

export default WeekSwitcher;
