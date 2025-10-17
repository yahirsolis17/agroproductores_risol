import React from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { formatDateDisplay, formatDateISO, parseLocalDateStrict } from '../../../../global/utils/date';
import type { IsoWeekRange } from './IsoWeekPicker';

interface WeekSwitcherProps {
  value: IsoWeekRange;
  onChange: (range: IsoWeekRange) => void;
}

const startOfISOWeek = (d: Date) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun,1=Mon,...
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date;
};
const endOfISOWeek = (d: Date) => {
  const start = startOfISOWeek(d);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return end;
};

const shiftISOWeek = (d: Date, weeks: number) => {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + weeks * 7);
  return copy;
};

const WeekSwitcher: React.FC<WeekSwitcherProps> = ({ value, onChange }) => {
  const base = value?.from || value?.to || formatDateISO(new Date());
  const baseDate = parseLocalDateStrict(base);
  const fromDate = startOfISOWeek(baseDate);
  const toDate = endOfISOWeek(baseDate);

  const go = (delta: number) => {
    const next = shiftISOWeek(baseDate, delta);
    onChange({ from: formatDateISO(startOfISOWeek(next)), to: formatDateISO(endOfISOWeek(next)) });
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Tooltip title="Semana anterior">
        <span>
          <IconButton size="small" onClick={() => go(-1)}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="body2" color="text.secondary">
        {`${formatDateDisplay(fromDate)} – ${formatDateDisplay(toDate)}`}
      </Typography>
      <Tooltip title="Siguiente semana">
        <span>
          <IconButton size="small" onClick={() => go(1)}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

export default WeekSwitcher;
