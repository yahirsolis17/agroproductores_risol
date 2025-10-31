// src/modules/gestion_bodega/components/common/IsoWeekPicker.tsx
// Picker minimalista de Semana ISO sin archivos nuevos.
// - Controla un rango semanal {from,to} (lunes→domingo) y opcionalmente isoSemana (YYYY-Www).
// - Compatible con el contrato anterior: onChange({ from, to }) sigue funcionando.
// - Añade labelOverride para mostrar “Semana NN (rango)”, Hoy y Limpiar.

import React, { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { formatDateISO, parseLocalDateStrict } from '../../../../global/utils/date';

import {
  startOfISOWeek,
  endOfISOWeek,
  dateToIsoKey,
  isoKeyToRange,
  prettyRange,
} from '../../hooks/useIsoWeek';

export interface IsoWeekRange {
  from?: string; // YYYY-MM-DD (lunes)
  to?: string;   // YYYY-MM-DD (domingo)
}

type OutRange = IsoWeekRange & { isoSemana?: string; direction?: 'jump' };

interface IsoWeekPickerProps {
  value?: IsoWeekRange & { isoSemana?: string };
  onChange?: (v: OutRange) => void;

  /** Texto alternativo para el tooltip/label (ej: "Semana 36 (01–07 Sep 2025)") */
  labelOverride?: string;

  /** Mostrar botones Hoy / Limpiar */
  showToday?: boolean;
  showClear?: boolean;
}

const IsoWeekPicker: React.FC<IsoWeekPickerProps> = ({
  value,
  onChange,
  labelOverride,
  showToday = true,
  showClear = true,
}) => {
  // Derivar rango base:
  // 1) si viene isoSemana, la traducimos a {from,to}
  // 2) si no, usamos value.from/to
  // 3) fallback: hoy
  const derivedRange = useMemo(() => {
    if (value?.isoSemana) {
      const r = isoKeyToRange(value.isoSemana);
      if (r) return r;
    }
    if (value?.from || value?.to) {
      const seed = value.from || value.to!;
      const d = parseLocalDateStrict(seed);
      return { from: formatDateISO(startOfISOWeek(d)), to: formatDateISO(endOfISOWeek(d)) };
    }
    const today = new Date();
    return { from: formatDateISO(startOfISOWeek(today)), to: formatDateISO(endOfISOWeek(today)) };
  }, [value?.isoSemana, value?.from, value?.to]);

  const label = useMemo(() => {
    if (labelOverride) return labelOverride;
    return prettyRange(derivedRange.from!, derivedRange.to!);
  }, [labelOverride, derivedRange]);

  const pick = (dateStr: string) => {
    if (!onChange) return;
    const d = parseLocalDateStrict(dateStr);
    if (Number.isNaN(d.getTime())) return;
    const s = startOfISOWeek(d);
    const e = endOfISOWeek(d);
    onChange({
      from: formatDateISO(s),
      to: formatDateISO(e),
      isoSemana: dateToIsoKey(s),
      direction: 'jump',
    });
  };

  const today = () => pick(formatDateISO(new Date()));
  const clear = () => onChange?.({ from: undefined, to: undefined, isoSemana: undefined, direction: 'jump' });

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <TextField
        size="small"
        type="date"
        label="Semana"
        InputLabelProps={{ shrink: true }}
        value={derivedRange.from ?? ''}
        onChange={(e) => pick(e.target.value)}
        sx={{ minWidth: 170 }}
      />
      <Tooltip title={label}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Tooltip>
      {showToday && (
        <Button size="small" variant="text" onClick={today}>
          Hoy
        </Button>
      )}
      {showClear && (
        <Button size="small" variant="text" onClick={clear}>
          Limpiar
        </Button>
      )}
    </Stack>
  );
};

export default IsoWeekPicker;
