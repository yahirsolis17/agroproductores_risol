// frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Close,
  InfoOutlined,
  LocalAtm,
  ReceiptLong,
  Savings,
  Percent,
  TrendingUp,
  Inventory2,
  Calculate,
} from '@mui/icons-material';
import { formatCurrency } from '../../../../../global/utils/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
}

const Row: React.FC<{ icon: React.ReactElement; title: string; desc: React.ReactNode }> = ({
  icon,
  title,
  desc,
}) => (
  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
    <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
    <ListItemText
      primary={<Typography variant="subtitle1" fontWeight={800}>{title}</Typography>}
      secondary={<Typography variant="body2" color="text.secondary">{desc}</Typography>}
    />
  </ListItem>
);

const GlosarioFinanzasModal: React.FC<Props> = ({ open, onClose }) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlined />
          <Typography variant="h6" fontWeight={900}>
            Glosario de finanzas (explicado fácil)
          </Typography>
        </Box>
        <IconButton
          aria-label="Cerrar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <List dense sx={{ mb: 1 }}>
          <Row
            icon={<LocalAtm color="success" />}
            title="Ventas totales (brutas)"
            desc={
              <>
                Es la suma de todo lo vendido <strong>sin descontar nada</strong>.  
                Ejemplo: 500 cajas × $40 = {formatCurrency(20000)}.
              </>
            }
          />

          <Row
            icon={<ReceiptLong color="warning" />}
            title="Gastos de venta"
            desc={
              <>
                Costos para poder vender: comisiones, fletes, mercado, embalaje, etc.
                <br />
                <em>Se restan de las ventas para obtener ventas netas.</em>
              </>
            }
          />

          <Row
            icon={<Savings color="primary" />}
            title="Inversión total"
            desc={
              <>
                Todo lo que metiste a la huerta para producir: fertilizantes, mano de obra,
                riego, maquinaria, etc. <em>Se resta al final</em>.
              </>
            }
          />

          <Row
            icon={<TrendingUp color="success" />}
            title="Ganancia neta"
            desc={
              <>
                Lo que realmente te quedó <strong>limpio</strong>:
                <br />
                <code>Ganancia neta = Ventas netas − Inversión total</code>
              </>
            }
          />

          <Row
            icon={<Percent color="info" />}
            title="ROI (Retorno de inversión)"
            desc={
              <>
                Qué tanto <strong>rindió</strong> tu inversión.
                <br />
                <code>ROI = (Ganancia neta / Inversión total) × 100</code>
              </>
            }
          />

          <Row
            icon={<Inventory2 color="secondary" />}
            title="Productividad (cajas/ha)"
            desc={
              <>
                Permite comparar huertas de distinto tamaño.  
                <code>Productividad = Cajas totales / Hectáreas</code>
              </>
            }
          />
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calculate fontSize="small" />
            <Typography variant="subtitle1" fontWeight={900}>
              Fórmulas en una línea
            </Typography>
          </Box>

          <Typography variant="body2">
            <strong>Ventas netas</strong> = Ventas totales − Gastos de venta
          </Typography>
          <Typography variant="body2">
            <strong>Ganancia neta</strong> = Ventas netas − Inversión total
          </Typography>
          <Typography variant="body2">
            <strong>ROI</strong> = (Ganancia neta / Inversión total) × 100
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlosarioFinanzasModal;
