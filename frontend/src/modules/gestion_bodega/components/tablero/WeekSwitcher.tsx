// frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx
// Control de semana ISO con modo disabled real:
// - Cuando disabled=true: sin flechas, sin popover y SIN mostrar rango (solo “—”).
// - Cuando enabled: navegación ISO normal; emite { from, to, isoSemana }.

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
import {
  startOfISOWeek,
  endOfISOWeek,
  shiftISOWeek,
  dateToIsoKey,
  isoKeyToRange,
  prettyRange,
} from '../../hooks/useIsoWeek';

// Contratos
export type IsoWeekRange = { from: string; to: string };
type OutRange = IsoWeekRange & { isoSemana?: string; direction?: 'prev' | 'next' | 'jump' };

interface WeekSwitcherProps {
  value: IsoWeekRange & { isoSemana?: string | null };
  onChange: (range: OutRange) => void;

  // Control de límites y estado global
  disabled?: boolean;           // ← deshabilita TODO el control y oculta el rango
  disablePrev?: boolean;
  disableNext?: boolean;

  // Mostrar popover para saltar por fecha
  showPicker?: boolean;
  // Delegar navegación (cuando se usa semana del backend)
  onPrev?: () => void;
  onNext?: () => void;
}

const WeekSwitcher: React.FC<WeekSwitcherProps> = ({
  value,
  onChange,
  disabled = false,
  disablePrev = false,
  disableNext = false,
  showPicker = true,
  onPrev,
  onNext,
}) => {
  // Base de cálculo: preferimos isoSemana -> from -> to -> hoy
  const baseISOKey = value?.isoSemana || undefined;
  const baseDateStr = value?.from || value?.to || formatDateISO(new Date());
  const baseDate = parseLocalDateStrict(baseDateStr);
  const isManual = !baseISOKey || baseISOKey === 'MANUAL';

  // Traducimos isoSemana a rango una sola vez (null-safe)
  const isoRange = useMemo(() => {
    if (!baseISOKey) return null;
    const r = isoKeyToRange(baseISOKey);
    return r ?? null;
  }, [baseISOKey]);

  // Fechas efectivas de la semana
  const fromDate = useMemo(
    () => {
      if (isManual && value?.from) return parseLocalDateStrict(value.from);
      const seed = isoRange ? parseLocalDateStrict(isoRange.from) : baseDate;
      return startOfISOWeek(seed);
    },
    [isManual, value?.from, isoRange, baseDate]
  );
  const toDate = useMemo(
    () => {
      if (isManual && value?.to) return parseLocalDateStrict(value.to);
      const seed = isoRange ? parseLocalDateStrict(isoRange.to) : baseDate;
      return endOfISOWeek(seed);
    },
    [isManual, value?.to, isoRange, baseDate]
  );

  const label = useMemo(() => `${formatDateDisplay(fromDate)} – ${formatDateDisplay(toDate)}`, [fromDate, toDate]);
  const pretty = useMemo(() => prettyRange(formatDateISO(fromDate), formatDateISO(toDate)), [fromDate, toDate]);

  const go = useCallback(
    (delta: number) => {
      if (disabled) return;
      // En modo MANUAL, delegamos navegación al padre (onChange recibe from/to directos)
      // Aquí mantenemos el comportamiento ISO solo cuando no es manual
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
    [fromDate, onChange, disabled]
  );

  // Atajos de teclado (← →) cuando el control tiene foco
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowLeft' && !disablePrev) {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight' && !disableNext) {
        e.preventDefault();
        go(1);
      }
    },
    [disablePrev, disableNext, go, disabled]
  );

  // Popover para “saltar” de semana con un date picker simple
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl) && !disabled;
  const handleOpen = (evt: React.MouseEvent<HTMLElement>) => {
    if (showPicker && !disabled) setAnchorEl(evt.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const jumpTo = (dateStr: string) => {
    if (disabled) return;
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
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        '&:focus-visible': { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}33`, borderRadius: 1 },
      }}
      aria-label="Navegación de semana"
      role="group"
      aria-disabled={disabled}
    >
      <Tooltip title="Semana anterior" disableHoverListener={disabled}>
        <span>
          <IconButton
            size="small"
            onClick={() => (onPrev ? onPrev() : go(-1))}
            disabled={disabled || disablePrev}
            aria-label="Semana anterior"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Etiqueta central. En modo disabled no mostramos rango para evitar confundir: solo “—”. */}
      <Tooltip title={disabled ? '' : pretty} disableHoverListener={disabled}>
        <Typography
          variant="body2"
          color="text.secondary"
          onClick={handleOpen}
          sx={{ cursor: showPicker && !disabled ? 'pointer' : 'default', userSelect: 'none' }}
          aria-live="polite"
        >
          {disabled ? '—' : label}
        </Typography>
      </Tooltip>

      <Tooltip title="Siguiente semana" disableHoverListener={disabled}>
        <span>
          <IconButton
            size="small"
            onClick={() => (onNext ? onNext() : go(1))}
            disabled={disabled || disableNext}
            aria-label="Siguiente semana"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Popover interno */}
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
