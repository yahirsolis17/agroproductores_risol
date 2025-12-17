import { useEffect, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { Save, Add } from "@mui/icons-material";

import { formatDateISO, parseLocalDateStrict } from "../../../../global/utils/date";

import type { Captura, CapturaCreateDTO, CapturaUpdateDTO } from "../../types/capturasTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Captura | null;
  bodegaId?: number;
  temporadaId?: number;
  onCreate: (payload: CapturaCreateDTO) => Promise<any> | void;
  onUpdate: (id: number, payload: CapturaUpdateDTO) => Promise<any> | void;
  blocked?: boolean;
  blockReason?: string;
  weekRange?: { from?: string; to?: string };
  busy?: boolean;
};

export default function RecepcionFormModal({
  open,
  onClose,
  initial,
  bodegaId,
  temporadaId,
  onCreate,
  onUpdate,
  blocked = false,
  blockReason,
  weekRange,
  busy = false,
}: Props) {
  const isEdit = !!initial;

  const [fecha, setFecha] = useState<string>(() => (initial?.fecha ? initial.fecha : formatDateISO(new Date())));
  const [huertero, setHuertero] = useState<string>(initial?.huertero_nombre ?? "");
  const [tipo, setTipo] = useState<string>(initial?.tipo_mango ?? "");
  const [cajasInput, setCajasInput] = useState<string>(() =>
    initial?.cantidad_cajas != null ? String(initial.cantidad_cajas) : ""
  );
  const [obs, setObs] = useState<string>(initial?.observaciones ?? "");

  const [touchedTipo, setTouchedTipo] = useState(false);
  const [touchedCajas, setTouchedCajas] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouchedTipo(false);
    setTouchedCajas(false);
    setSubmitted(false);

    if (initial) {
      setFecha(initial.fecha);
      setHuertero(initial.huertero_nombre ?? "");
      setTipo(initial.tipo_mango ?? "");
      setCajasInput(initial.cantidad_cajas != null ? String(initial.cantidad_cajas) : "");
      setObs(initial.observaciones ?? "");
    } else {
      setFecha(formatDateISO(new Date()));
      setHuertero("");
      setTipo("");
      setCajasInput("");
      setObs("");
    }
  }, [open, initial]);

  const parsedDate = useMemo(() => parseLocalDateStrict(fecha), [fecha]);
  const fechaValida = useMemo(() => !isNaN(parsedDate.getTime()), [parsedDate]);

  const outOfWeekRange = useMemo(() => {
    if (!weekRange?.from || !weekRange?.to || !fechaValida) return false;
    const from = parseLocalDateStrict(weekRange.from);
    const to = parseLocalDateStrict(weekRange.to);
    const d = new Date(parsedDate.getTime());
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < from || d > to;
  }, [weekRange?.from, weekRange?.to, parsedDate, fechaValida]);

  const isTodayOrYesterday = useMemo(() => {
    if (!fechaValida) return false;
    const d = new Date(parsedDate.getTime());
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays === 0 || diffDays === 1;
  }, [parsedDate, fechaValida]);

  const tipoValido = useMemo(() => typeof tipo === "string" && tipo.trim().length > 0, [tipo]);

  const cajasParsed = useMemo(() => {
    const raw = (cajasInput ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }, [cajasInput]);

  const cajasValidas = useMemo(() => cajasParsed != null && cajasParsed > 0, [cajasParsed]);

  const creationHasContext = useMemo(() => !!bodegaId && !!temporadaId, [bodegaId, temporadaId]);

  const disabledSubmit = useMemo(() => {
    if (blocked || busy) return true;
    if (!fechaValida || outOfWeekRange) return true;
    if (!tipoValido || !cajasValidas) return true;
    if (!isEdit && !creationHasContext) return true;
    if (!isTodayOrYesterday) return true;
    return false;
  }, [blocked, busy, fechaValida, outOfWeekRange, tipoValido, cajasValidas, isEdit, creationHasContext, isTodayOrYesterday]);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (disabledSubmit) return;

    const payloadBase = {
      bodega: initial?.bodega ?? (bodegaId as number),
      temporada: initial?.temporada ?? (temporadaId as number),
      fecha,
      huertero_nombre: huertero,
      tipo_mango: tipo.trim(),
      cantidad_cajas: cajasParsed as number,
      observaciones: obs?.trim() ? obs.trim() : "",
    };

    try {
      if (isEdit && initial) {
        const payload: CapturaUpdateDTO = { ...payloadBase };
        await onUpdate(initial.id, payload);
      } else {
        const payload: CapturaCreateDTO = { ...payloadBase };
        await onCreate(payload);
      }
      onClose();
    } catch {
      // Notificación ya mostrada por el servicio; mantener modal abierto.
    }
  };

  const fechaHelperText = useMemo(() => {
    if (!fechaValida) return "Fecha inválida.";
    if (outOfWeekRange && weekRange?.from && weekRange?.to) {
      const f = parseLocalDateStrict(weekRange.from).toLocaleDateString();
      const t = parseLocalDateStrict(weekRange.to).toLocaleDateString();
      return `Fuera del rango de la semana (${f} - ${t}).`;
    }
    if (!isTodayOrYesterday) return "El sistema solo acepta capturas para HOY o AYER.";
    return "Solo HOY o AYER según reglas del backend.";
  }, [fechaValida, outOfWeekRange, weekRange?.from, weekRange?.to, isTodayOrYesterday]);

  const tipoError = (!tipoValido && (touchedTipo || submitted)) || false;
  const cajasError = (!cajasValidas && (touchedCajas || submitted)) || false;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="recepcion-form-title">
      <DialogTitle id="recepcion-form-title">
        {isEdit ? "Editar recepción" : "Registrar recepción"}
      </DialogTitle>

      <DialogContent dividers>
        {blocked && (
          <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <AlertTitle>Operación bloqueada</AlertTitle>
            {blockReason || "Semana cerrada o temporada finalizada. El formulario está en solo lectura."}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Fecha"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={!fechaValida || outOfWeekRange || !isTodayOrYesterday}
            helperText={fechaHelperText}
            disabled={blocked || busy}
          />

          <TextField
            label="Huertero"
            size="small"
            value={huertero}
            onChange={(e) => setHuertero(e.target.value)}
            disabled={blocked || busy}
          />

          <TextField
            label="Tipo de mango"
            size="small"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            onBlur={() => setTouchedTipo(true)}
            error={tipoError}
            helperText={tipoError ? "El tipo es requerido." : " "}
            disabled={blocked || busy}
          />

          <TextField
            label="Cantidad de cajas"
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            value={cajasInput}
            onChange={(e) => setCajasInput(e.target.value)}
            onBlur={() => setTouchedCajas(true)}
            error={cajasError}
            helperText={cajasError ? "Debe ser un entero mayor a 0." : " "}
            disabled={blocked || busy}
          />

          <TextField
            label="Observaciones"
            size="small"
            multiline
            minRows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={blocked || busy}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={disabledSubmit}
          startIcon={isEdit ? <Save /> : <Add />}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          {isEdit ? "Guardar cambios" : "Crear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

