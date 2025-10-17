// frontend/src/modules/gestion_huerta/components/reportes/common/ReportesProduccionToolbar.tsx
import {
  Stack,
  Button,
  CircularProgress,
  Tooltip,
  Paper,
  Box,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { FormatoReporte } from '../../types/reportesProduccionTypes';
import { useAuth } from '../../../gestion_usuarios/context/AuthContext';

interface Props {
  from?: string;
  to?: string;
  /** Ya no mostramos selector; se deja opcional para compatibilidad */
  formato?: FormatoReporte;
  loading?: boolean;
  /** Ya no se usa, pero se deja opcional para compatibilidad */
  onChange?: (filters: { from?: string; to?: string; formato: FormatoReporte }) => void;
  onRefresh: () => void;
  onExport: (formato: FormatoReporte) => void;
  showExportButtons?: boolean;
  /** Permisos opcionales para habilitar/ocultar exportación */
  permExportPdf?: string | string[];
  permExportExcel?: string | string[];
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

const GradientButton = styled(Button)(({ theme }) => ({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 700,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
}));

export default function ReportesProduccionToolbar({
  loading = false,
  onRefresh,
  onExport,
  showExportButtons = true,
  permExportPdf,
  permExportExcel,
}: Props) {
  const { user, hasPerm } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Normaliza para permitir arrays de permisos (OR)
  const can = (perm?: string | string[]) => {
    if (!perm) return true; // si no se especifica, no restringe
    const arr = Array.isArray(perm) ? perm : [perm];
    return isAdmin || arr.some(p => hasPerm(p));
  };

  const allowPdf = can(permExportPdf);
  const allowExcel = can(permExportExcel);
  const disabledTooltip = 'Requiere permiso de Ver y Exportar';
  return (
    <ToolbarContainer elevation={0}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Actualizar datos">
          <span>
            <GradientButton
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
              {loading ? 'Cargando…' : 'Actualizar'}
            </GradientButton>
          </span>
        </Tooltip>
      </Box>

      {showExportButtons && (
        <Stack direction="row" spacing={1}>
          <Tooltip title={allowPdf ? "Exportar como PDF" : disabledTooltip}>
            <span>
              <GradientButton
                variant="contained"
                startIcon={<PdfIcon />}
                onClick={() => onExport('pdf')}
                disabled={loading || !allowPdf}
                sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                })}
              >
                PDF
              </GradientButton>
            </span>
          </Tooltip>

          <Tooltip title={allowExcel ? "Exportar como Excel" : disabledTooltip}>
            <span>
              <GradientButton
                variant="contained"
                startIcon={<ExcelIcon />}
                onClick={() => onExport('excel')}
                disabled={loading || !allowExcel}
                color="success"
                sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.info.dark})`,
                  },
                })}
              >
                Excel
              </GradientButton>
            </span>
          </Tooltip>
        </Stack>
      )}
    </ToolbarContainer>
  );
}
