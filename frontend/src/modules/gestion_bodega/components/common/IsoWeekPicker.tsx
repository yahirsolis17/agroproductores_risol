import React from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { formatDateDisplay, formatDateISO, parseLocalDateStrict } from '../../../../global/utils/date';

export interface IsoWeekRange {
  from?: string;
  to?: string;
}

interface IsoWeekPickerProps {
  value?: IsoWeekRange;
  onChange?: (v: IsoWeekRange) => void;
}

const startOfISOWeek = (d: Date) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
};
const endOfISOWeek = (d: Date) => {
  const start = startOfISOWeek(d);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return end;
};

const IsoWeekPicker: React.FC<IsoWeekPickerProps> = ({ value, onChange }) => {
  const from = value?.from;
  const to = value?.to;
  const label = from || to
    ? `${formatDateDisplay(parseLocalDateStrict(from || to!))} – ${formatDateDisplay(parseLocalDateStrict(to || from!))}`
    : 'Sin rango';

  const pick = (dateStr: string) => {
    if (!onChange) return;
    const d = parseLocalDateStrict(dateStr);
    if (isNaN(d.getTime())) return;
    onChange({ from: formatDateISO(startOfISOWeek(d)), to: formatDateISO(endOfISOWeek(d)) });
  };

  const today = () => pick(formatDateISO(new Date()));
  const clear = () => onChange?.({ from: undefined, to: undefined });

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <TextField
        size="small"
        type="date"
        label="Semana"
        InputLabelProps={{ shrink: true }}
        value={from ?? ''}
        onChange={(e) => pick(e.target.value)}
      />
      <Tooltip title={label}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
      </Tooltip>
      <Button size="small" variant="text" onClick={today}>Hoy</Button>
      <Button size="small" variant="text" onClick={clear}>Limpiar</Button>
    </Stack>
  );
};

export default IsoWeekPicker;
