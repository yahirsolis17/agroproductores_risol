import { Button, CircularProgress, Paper, Stack, Tooltip, Box } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import ExcelIcon from '@mui/icons-material/TableChart';

export type ReporteExportFormat = 'pdf' | 'excel';

interface Props {
  loading?: boolean;
  onRefresh: () => void;
  onExport: (formato: ReporteExportFormat) => void;
  showExportButtons?: boolean;
  canExportPdf?: boolean;
  canExportExcel?: boolean;
  pdfTooltip?: string;
  excelTooltip?: string;
}

const ToolbarContainer = styled(Paper)(({ theme }) => ({
  borderRadius: 16,
  padding: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1.5),
  background:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.7)
      : `linear-gradient(160deg, ${alpha('#f8fafc', 0.95)} 0%, ${alpha('#ffffff', 0.98)} 100%)`,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 700,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
}));

export default function ReportesToolbar({
  loading = false,
  onRefresh,
  onExport,
  showExportButtons = true,
  canExportPdf = true,
  canExportExcel = true,
  pdfTooltip = 'Exportar como PDF',
  excelTooltip = 'Exportar como Excel',
}: Props) {
  return (
    <ToolbarContainer elevation={0}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Actualizar datos">
          <span>
            <ActionButton
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={onRefresh}
              disabled={loading}
              sx={(theme) => ({
                borderColor: alpha(theme.palette.primary.main, 0.3),
                color: theme.palette.primary.main,
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  background: alpha(theme.palette.primary.main, 0.06),
                },
              })}
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </ActionButton>
          </span>
        </Tooltip>
      </Box>

      {showExportButtons && (
        <Stack direction="row" spacing={1}>
          <Tooltip title={canExportPdf ? 'Exportar como PDF' : pdfTooltip}>
            <span>
              <ActionButton
                variant="contained"
                startIcon={<PdfIcon />}
                onClick={() => onExport('pdf')}
                disabled={loading || !canExportPdf}
                sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                })}
              >
                PDF
              </ActionButton>
            </span>
          </Tooltip>

          <Tooltip title={canExportExcel ? 'Exportar como Excel' : excelTooltip}>
            <span>
              <ActionButton
                variant="contained"
                startIcon={<ExcelIcon />}
                onClick={() => onExport('excel')}
                disabled={loading || !canExportExcel}
                color="success"
                sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.info.dark})`,
                  },
                })}
              >
                Excel
              </ActionButton>
            </span>
          </Tooltip>
        </Stack>
      )}
    </ToolbarContainer>
  );
}
