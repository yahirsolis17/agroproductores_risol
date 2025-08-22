// frontend/src/modules/gestion_huerta/components/reportes/common/ReportToolbar.tsx
import { Stack, TextField, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  from?: string;
  to?: string;
  onChange: (r: { from?: string; to?: string }) => void;
  onRefresh: () => void;
}

export default function ReportToolbar({ from, to, onChange, onRefresh }: Props) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <TextField
        type="date"
        size="small"
        label="Desde"
        value={from || ''}
        onChange={(e) => onChange({ from: e.target.value || undefined, to })}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        type="date"
        size="small"
        label="Hasta"
        value={to || ''}
        onChange={(e) => onChange({ from, to: e.target.value || undefined })}
        InputLabelProps={{ shrink: true }}
      />
      <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRefresh}>
        Actualizar
      </Button>
    </Stack>
  );
}
