// frontend/src/modules/gestion_huerta/components/reportes/common/ReportesProduccionToolbar.tsx
import {
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  DataObject as JsonIcon,
} from '@mui/icons-material';
import { FormatoReporte } from '../../../services/reportesProduccionService';

interface Props {
  from?: string;
  to?: string;
  formato: FormatoReporte;
  loading?: boolean;
  onChange: (filters: { from?: string; to?: string; formato: FormatoReporte }) => void;
  onRefresh: () => void;
  onExport: (formato: FormatoReporte) => void;
  showExportButtons?: boolean;
}

const formatoIcons = {
  json: <JsonIcon />,
  pdf: <PdfIcon />,
  excel: <ExcelIcon />,
};

const formatoLabels = {
  json: 'JSON',
  pdf: 'PDF',
  excel: 'Excel',
};

export default function ReportesProduccionToolbar({
  from,
  to,
  formato,
  loading = false,
  onChange,
  onRefresh,
  onExport,
  showExportButtons = true,
}: Props) {
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    onChange({
      from: field === 'from' ? (value || undefined) : from,
      to: field === 'to' ? (value || undefined) : to,
      formato,
    });
  };

  const handleFormatoChange = (newFormato: FormatoReporte) => {
    onChange({
      from,
      to,
      formato: newFormato,
    });
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      {/* Filtros de fecha */}
      <TextField
        type="date"
        size="small"
        label="Fecha inicio"
        value={from || ''}
        onChange={(e) => handleDateChange('from', e.target.value)}
        InputLabelProps={{ shrink: true }}
        disabled={loading}
      />
      
      <TextField
        type="date"
        size="small"
        label="Fecha fin"
        value={to || ''}
        onChange={(e) => handleDateChange('to', e.target.value)}
        InputLabelProps={{ shrink: true }}
        disabled={loading}
      />

      {/* Selector de formato */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Formato</InputLabel>
        <Select
          value={formato}
          label="Formato"
          onChange={(e) => handleFormatoChange(e.target.value as FormatoReporte)}
          disabled={loading}
        >
          <MenuItem value="json">
            <Stack direction="row" spacing={1} alignItems="center">
              <JsonIcon fontSize="small" />
              <span>JSON</span>
            </Stack>
          </MenuItem>
          <MenuItem value="pdf">
            <Stack direction="row" spacing={1} alignItems="center">
              <PdfIcon fontSize="small" />
              <span>PDF</span>
            </Stack>
          </MenuItem>
          <MenuItem value="excel">
            <Stack direction="row" spacing={1} alignItems="center">
              <ExcelIcon fontSize="small" />
              <span>Excel</span>
            </Stack>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Botón de actualizar */}
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? 'Cargando...' : 'Actualizar'}
      </Button>

      {/* Botones de exportación */}
      {showExportButtons && (
        <>
          {(['json', 'pdf', 'excel'] as FormatoReporte[]).map((fmt) => (
            <Tooltip key={fmt} title={`Exportar como ${formatoLabels[fmt]}`}>
              <Button
                variant={formato === fmt ? 'contained' : 'outlined'}
                size="small"
                startIcon={formatoIcons[fmt]}
                onClick={() => onExport(fmt)}
                disabled={loading}
                color={formato === fmt ? 'primary' : 'inherit'}
              >
                {formatoLabels[fmt]}
              </Button>
            </Tooltip>
          ))}
        </>
      )}
    </Stack>
  );
}
