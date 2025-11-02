// Picker minimalista de Semana ISO sin archivos nuevos.
// - Controla un rango semanal {from,to} (lunes→domingo) y opcionalmente isoSemana (YYYY-Www).
// - Compatible con el contrato anterior: onChange({ from, to }) sigue funcionando.
// - Añade labelOverride para mostrar “Semana NN (rango)”, Hoy y Limpiar.
// - Nuevos: disabled, minDateISO, maxDateISO, clamp de fechas y accesibilidad.

import React, { useMemo, useCallback } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { formatDateISO, parseLocalDateStrict } from "../../../../global/utils/date";

import {
  startOfISOWeek,
  endOfISOWeek,
  dateToIsoKey,
  isoKeyToRange,
  prettyRange,
} from "../../hooks/useIsoWeek";

export interface IsoWeekRange {
  from?: string; // YYYY-MM-DD (lunes)
  to?: string;   // YYYY-MM-DD (domingo)
}

type OutRange = IsoWeekRange & { isoSemana?: string; direction?: "jump" };

interface IsoWeekPickerProps {
  value?: IsoWeekRange & { isoSemana?: string };
  onChange?: (v: OutRange) => void;

  /** Texto alternativo para el tooltip/label (ej: "Semana 36 (01–07 Sep 2025)") */
  labelOverride?: string;

  /** Mostrar botones Hoy / Limpiar */
  showToday?: boolean;
  showClear?: boolean;

  /** Deshabilitar todo el control (ej: sin semanas aún) */
  disabled?: boolean;

  /** Límite inferior/superior permitido (YYYY-MM-DD). Opcional. */
  minDateISO?: string;
  maxDateISO?: string;
}

function clampDate(d: Date, minISO?: string, maxISO?: string): Date {
  const t = d.getTime();
  const minT = minISO ? parseLocalDateStrict(minISO).getTime() : undefined;
  const maxT = maxISO ? parseLocalDateStrict(maxISO).getTime() : undefined;
  if (minT !== undefined && t < minT) return parseLocalDateStrict(minISO!);
  if (maxT !== undefined && t > maxT) return parseLocalDateStrict(maxISO!);
  return d;
}

const IsoWeekPicker: React.FC<IsoWeekPickerProps> = ({
  value,
  onChange,
  labelOverride,
  showToday = true,
  showClear = true,
  disabled = false,
  minDateISO,
  maxDateISO,
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

  const emit = useCallback(
    (dateStr: string) => {
      if (!onChange || disabled) return;
      const raw = parseLocalDateStrict(dateStr);
      if (Number.isNaN(raw.getTime())) return;

      // Clamp al rango permitido antes de calcular la semana
      const clamped = clampDate(raw, minDateISO, maxDateISO);
      const s = startOfISOWeek(clamped);
      const e = endOfISOWeek(clamped);

      onChange({
        from: formatDateISO(s),
        to: formatDateISO(e),
        isoSemana: dateToIsoKey(s),
        direction: "jump",
      });
    },
    [onChange, disabled, minDateISO, maxDateISO]
  );

  const today = useCallback(() => {
    const base = clampDate(new Date(), minDateISO, maxDateISO);
    emit(formatDateISO(base));
  }, [emit, minDateISO, maxDateISO]);

  const clear = useCallback(() => {
    if (!onChange || disabled) return;
    onChange({ from: undefined, to: undefined, isoSemana: undefined, direction: "jump" });
  }, [onChange, disabled]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      role="group"
      aria-label="Selector de semana ISO"
      aria-disabled={disabled ? "true" : "false"}
    >
      <TextField
        size="small"
        type="date"
        label="Semana"
        InputLabelProps={{ shrink: true }}
        value={derivedRange.from ?? ""}
        onChange={(e) => emit(e.target.value)}
        disabled={disabled}
        inputProps={{
          min: minDateISO,
          max: maxDateISO,
          "aria-label": "Seleccionar fecha base de la semana",
        }}
        sx={{ minWidth: 170 }}
      />

      <Tooltip title={label}>
        <Typography variant="caption" color="text.secondary" aria-live="polite">
          {label}
        </Typography>
      </Tooltip>

      {showToday && (
        <Button size="small" variant="text" onClick={today} disabled={disabled}>
          Hoy
        </Button>
      )}

      {showClear && (
        <Button size="small" variant="text" onClick={clear} disabled={disabled}>
          Limpiar
        </Button>
      )}
    </Stack>
  );
};

export default IsoWeekPicker;
