import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import { formatDateDisplay, parseLocalDateStrict } from '../../../../global/utils/date';

type Props = {
  blocked: boolean;
  reason?: string;
  range?: { from?: string; to?: string };
};

export default function RulesBanner({ blocked, reason, range }: Props) {
  if (!blocked) return null;

  const from = range?.from ? formatDateDisplay(parseLocalDateStrict(range.from)) : undefined;
  const to = range?.to ? formatDateDisplay(parseLocalDateStrict(range.to)) : undefined;
  const haveRange = Boolean(from && to);

  const title = reason || 'Operaciones bloqueadas';
  let message = 'No se pueden crear/editar/archivar/restaurar.';
  if (reason?.toLowerCase().includes('semana')) {
    message = haveRange
      ? `Semana cerrada (Lun–Dom: ${from} – ${to}). No es posible crear/editar/archivar/restaurar.`
      : 'Semana cerrada. No es posible crear/editar/archivar/restaurar.';
  } else if (reason?.toLowerCase().includes('finalizada')) {
    message = 'Temporada finalizada. Este módulo queda en solo lectura.';
  }

  const severity = reason?.toLowerCase().includes('finalizada') ? 'error' : 'warning';

  return (
    <Stack sx={{ mb: 2 }}>
      <Alert severity={severity as any} variant="outlined">
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Stack>
  );
}
