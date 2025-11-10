import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatDateDisplay, parseLocalDateStrict } from '../../../../global/utils/date';

type Range = { from?: string; to?: string };

/**
 * Props originales:
 *  - blocked: boolean
 *  - reason?: string
 *  - range?: { from, to }
 *
 * Compat extra (para evitar TS2322 en Tablero):
 *  - show?: boolean  (alias de `blocked`)
 */
type Props = {
  blocked?: boolean;
  show?: boolean;            // alias; si viene, tiene prioridad sobre blocked
  reason?: string;
  range?: Range;
  sx?: SxProps<Theme>;
  className?: string;
};

export default function RulesBanner({
  blocked,
  show,
  reason,
  range,
  sx,
  className,
}: Props) {
  const isBlocked = Boolean(typeof show === 'boolean' ? show : blocked);
  if (!isBlocked) return null;

  const from = range?.from ? formatDateDisplay(parseLocalDateStrict(range.from)) : undefined;
  const to = range?.to ? formatDateDisplay(parseLocalDateStrict(range.to)) : undefined;
  const haveRange = Boolean(from && to);

  const title = reason || 'Operaciones bloqueadas';
  let message = 'No se pueden crear/editar/archivar/restaurar.';

  const r = (reason || '').toLowerCase();
  if (r.includes('semana')) {
    message = haveRange
      ? `Semana cerrada (Lun–Dom: ${from} – ${to}). No es posible crear/editar/archivar/restaurar.`
      : 'Semana cerrada. No es posible crear/editar/archivar/restaurar.';
  } else if (r.includes('finalizada')) {
    message = 'Temporada finalizada. Este módulo queda en solo lectura.';
  }

  const severity: 'warning' | 'error' =
    r.includes('finalizada') ? 'error' : 'warning';

  return (
    <Stack sx={{ mb: 2, ...sx }} className={className}>
      <Alert severity={severity} variant="outlined" sx={{ borderRadius: 2 }}>
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Stack>
  );
}
