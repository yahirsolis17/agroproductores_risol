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

import {
  formatDateISO,
  parseLocalDateStrict,
} from "../../../../global/utils/date";

import type {
  Captura,
  CapturaCreateDTO,
  CapturaUpdateDTO,
} from "../../types/capturasTypes";

/**
 * Modal de creación/edición de Recepciones (Capturas).
 * Pensado para integrarse con la lógica semanal del Tablero.
 */
type Props = {
  open: boolean;
  onClose: () => void;

  /** Si viene `initial` => modo edición */
  initial?: Captura | null;

  /** Contexto obligatorio en creación; en edición se toma de `initial` */
  bodegaId?: number;
  temporadaId?: number;

  /** Callbacks CRUD */
  onCreate: (payload: CapturaCreateDTO) => Promise<any> | void;
  onUpdate: (id: number, payload: CapturaUpdateDTO) => Promise<any> | void;

  /** Integración con semanas/temporadas (opcional) */
  blocked?: boolean; // ejemplo: semana cerrada / temporada finalizada
  blockReason?: string; // texto para alerta
  weekRange?: { from?: string; to?: string }; // rango visible (para hints)

  /** Deshabilitar submit mientras guardas desde arriba (slice/hook) */
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

  // -----------------------------
  // Estado local
  // -----------------------------
  const [fecha, setFecha] = useState<string>(() =>
    initial?.fecha ? initial.fecha : formatDateISO(new Date())
  );
  const [huertero, setHuertero] = useState<string>(initial?.huertero_nombre ?? "");
  const [tipo, setTipo] = useState<string>(initial?.tipo_mango ?? "");
  const [cajas, setCajas] = useState<number>(initial?.cantidad_cajas ?? 1);
  const [obs, setObs] = useState<string>(initial?.observaciones ?? "");

  // Reset controlado en open / initial
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFecha(initial.fecha);
      setHuertero(initial.huertero_nombre ?? "");
      setTipo(initial.tipo_mango ?? "");
      setCajas(initial.cantidad_cajas ?? 1);
      setObs(initial.observaciones ?? "");
    } else {
      setFecha(formatDateISO(new Date()));
      setHuertero("");
      setTipo("");
      setCajas(1);
      setObs("");
    }
  }, [open, initial]);

  // -----------------------------
  // Validaciones
  // -----------------------------
  const parsedDate = useMemo(() => parseLocalDateStrict(fecha), [fecha]);
  const fechaValida = useMemo(() => !isNaN(parsedDate.getTime()), [parsedDate]);

  // Validación por rango semanal (si se provee)
  const outOfWeekRange = useMemo(() => {
    if (!weekRange?.from || !weekRange?.to || !fechaValida) return false;
    const from = parseLocalDateStrict(weekRange.from);
    const to = parseLocalDateStrict(weekRange.to);
    const d = parsedDate;
    // normalizamos a 00:00 para comparar solo fechas
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < from || d > to;
  }, [weekRange?.from, weekRange?.to, parsedDate, fechaValida]);

  const tipoValido = useMemo(() => typeof tipo === "string" && tipo.trim().length > 0, [tipo]);
  const cajasValidas = useMemo(() => Number.isFinite(cajas) && cajas > 0, [cajas]);

  const creationHasContext = useMemo(
    () => !!bodegaId && !!temporadaId,
    [bodegaId, temporadaId]
  );

  const disabledSubmit = useMemo(() => {
    if (blocked || busy) return true;
    if (!fechaValida || !tipoValido || !cajasValidas) return true;
    if (!isEdit && !creationHasContext) return true;
    if (outOfWeekRange) return true;
    return false;
  }, [
    blocked,
    busy,
    fechaValida,
    tipoValido,
    cajasValidas,
    isEdit,
    creationHasContext,
    outOfWeekRange,
  ]);

  // -----------------------------
  // Submit
  // -----------------------------
  const handleSubmit = async () => {
    const payloadBase = {
      bodega: initial?.bodega ?? (bodegaId as number),
      temporada: initial?.temporada ?? (temporadaId as number),
      fecha,
      huertero_nombre: huertero,
      tipo_mango: tipo.trim(),
      cantidad_cajas: cajas,
      observaciones: obs ? obs : null,
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
      // Se asume que el servicio ya muestra notificación; mantenemos el modal abierto.
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  const fechaHelperText = useMemo(() => {
    if (!fechaValida) return "Fecha inválida.";
    if (outOfWeekRange && weekRange?.from && weekRange?.to) {
      const f = parseLocalDateStrict(weekRange.from).toLocaleDateString();
      const t = parseLocalDateStrict(weekRange.to).toLocaleDateString();
      return `Fuera del rango de la semana (${f} – ${t}).`;
    }
    return "";
  }, [fechaValida, outOfWeekRange, weekRange?.from, weekRange?.to]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="recepcion-form-title">
      <DialogTitle id="recepcion-form-title">
        {isEdit ? "Editar recepción" : "Registrar recepción"}
      </DialogTitle>

      <DialogContent dividers>
        {/* Banner de bloqueo contextual */}
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
            error={!fechaValida || outOfWeekRange}
            helperText={fechaHelperText || "Solo HOY o AYER según reglas del backend."}
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
            error={!tipoValido}
            helperText={!tipoValido ? "El tipo es requerido." : " "}
            disabled={blocked || busy}
          />

          <TextField
            label="Cantidad de cajas"
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            value={Number.isFinite(cajas) ? cajas : ""}
            onChange={(e) => {
              const raw = e.target.value;
              // tolerante a cadena vacía para no pelear con el input controlado
              if (raw === "") {
                setCajas(NaN as any);
                return;
              }
              const v = Math.trunc(Number(raw));
              setCajas(Number.isFinite(v) && v > 0 ? v : 0);
            }}
            error={!cajasValidas}
            helperText={!cajasValidas ? "Debe ser un entero mayor a 0." : " "}
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
