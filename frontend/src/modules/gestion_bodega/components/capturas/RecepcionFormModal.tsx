import { useEffect, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import { Save, Add } from "@mui/icons-material";

// Reemplazamos autocomplete/cantidad custom por campos manuales simples
import { formatDateISO, parseLocalDateStrict } from "../../../../global/utils/date";

import type {
  Captura,
  CapturaCreateDTO,
  CapturaUpdateDTO,
} from "../../../../modules/gestion_bodega/types/capturasTypes";

type Props = {
  open: boolean;
  onClose: () => void;

  // si hay initial => es ediciÃ³n
  initial?: Captura | null;

  bodegaId?: number;
  temporadaId?: number;

  onCreate: (payload: CapturaCreateDTO) => Promise<any> | void;
  onUpdate: (id: number, payload: CapturaUpdateDTO) => Promise<any> | void;
};

export default function RecepcionFormModal({
  open,
  onClose,
  initial,
  bodegaId,
  temporadaId,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!initial;

  // estado local
  const [fecha, setFecha] = useState<string>(() => {
    if (initial?.fecha) return initial.fecha;
    const today = formatDateISO(new Date());
    return today;
  });
  const [huertero, setHuertero] = useState<string>(initial?.huertero_nombre ?? "");
  const [tipo, setTipo] = useState<string>(initial?.tipo_mango ?? "");
  const [cajas, setCajas] = useState<number>(initial?.cantidad_cajas ?? 1);
  const [obs, setObs] = useState<string>(initial?.observaciones ?? "");

  // sincroniza al abrir en modo ediciÃ³n
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

  const disabledSubmit = useMemo(() => {
    const d = parseLocalDateStrict(fecha);
    // huertero es opcional; solo validamos fecha, tipo y cantidad > 0
    return !fecha || isNaN(d.getTime()) || !tipo || !(cajas > 0);
  }, [fecha, tipo, cajas]);

  const handleSubmit = async () => {
    const payloadBase = {
      bodega: initial?.bodega ?? (bodegaId as number),
      temporada: initial?.temporada ?? (temporadaId as number),
      fecha,
      huertero_nombre: huertero,
      tipo_mango: tipo,
      cantidad_cajas: cajas,
      observaciones: obs || null,
    };

    if (isEdit && initial) {
      const payload: CapturaUpdateDTO = { ...payloadBase };
      await onUpdate(initial.id, payload);
    } else {
      const payload: CapturaCreateDTO = { ...payloadBase };
      await onCreate(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Editar recepción" : "Registrar recepción"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Fecha"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />

          <TextField
            label="Huertero"
            size="small"
            value={huertero}
            onChange={(e) => setHuertero(e.target.value)}
          />

          <TextField
            label="Tipo de mango"
            size="small"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />

          <TextField
            label="Cantidad de cajas"
            type="number"
            size="small"
            inputProps={{ min: 1 }}
            value={Number.isFinite(cajas) ? cajas : ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setCajas(Number.isFinite(v) && v > 0 ? v : 0);
            }}
          />

          <TextField
            label="Observaciones"
            size="small"
            multiline
            minRows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={disabledSubmit || (!isEdit && (!bodegaId || !temporadaId))}
          startIcon={isEdit ? <Save /> : <Add />}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
        >
          {isEdit ? "Guardar cambios" : "Crear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}



