import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

import TipoMangoAutocomplete from '../common/TipoMangoAutocomplete';
import QuantityInput from '../common/QuantityInput';
import { formatDateISO, parseLocalDateStrict } from '../../../../global/utils/date';

type CreatePayload = {
  fecha: string;
  tipo_mango: string;
  cantidad_cajas: number;
  huertero_nombre?: string;
  observaciones?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePayload) => Promise<void> | void;
  disabled?: boolean;
  bodegaId?: number;
  temporadaId?: number;
};

export default function FastCaptureModal({ open, onClose, onCreate, disabled, bodegaId, temporadaId }: Props) {
  const [fecha, setFecha] = useState<string>(formatDateISO(new Date()));
  const [tipo, setTipo] = useState<string>('');
  const [cajas, setCajas] = useState<number>(1);
  const [huertero, setHuertero] = useState<string>('');
  const [obs, setObs] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setFecha(formatDateISO(new Date()));
    setTipo('');
    setCajas(1);
    setHuertero('');
    setObs('');
  }, [open]);

  const disabledSubmit = useMemo(() => {
    if (disabled) return true;
    if (!bodegaId || !temporadaId) return true;
    const d = parseLocalDateStrict(fecha);
    return isNaN(d.getTime()) || !tipo || !(cajas > 0);
  }, [disabled, bodegaId, temporadaId, fecha, tipo, cajas]);

  const pickHoy = () => setFecha(formatDateISO(new Date()));
  const pickAyer = () => {
    const d = parseLocalDateStrict(new Date());
    d.setDate(d.getDate() - 1);
    setFecha(formatDateISO(d));
  };

  const handleCreate = async () => {
    const payload: CreatePayload = {
      fecha,
      tipo_mango: tipo,
      cantidad_cajas: cajas,
      huertero_nombre: huertero || undefined,
      observaciones: obs || undefined,
    };
    await onCreate(payload);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Captura rápida</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" size="small" onClick={pickHoy}>Hoy</Button>
            <Button variant="outlined" size="small" onClick={pickAyer}>Ayer</Button>
            <TextField
              label="Fecha"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Stack>

          <TipoMangoAutocomplete value={tipo} onChange={(v?: string) => setTipo(v ?? '')} />

          <QuantityInput value={cajas} onChange={setCajas} min={1} />

          <TextField label="Huertero (opcional)" size="small" value={huertero} onChange={(e) => setHuertero(e.target.value)} />

          <TextField label="Observaciones (opcional)" size="small" multiline minRows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Tooltip title={disabled ? 'Operación no disponible' : ''} disableHoverListener={!disabled}>
          <span>
            <Button variant="contained" onClick={handleCreate} disabled={disabledSubmit}>Crear</Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
