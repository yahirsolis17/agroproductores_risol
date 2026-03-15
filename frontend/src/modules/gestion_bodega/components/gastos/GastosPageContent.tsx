// frontend/src/modules/gestion_bodega/components/gastos/GastosPageContent.tsx
// Vista completa de Gastos (MUI + framer-motion)
import React, { useState } from 'react';
import {
  Box, Tab, Tabs, alpha, useTheme, Typography, Alert,
} from '@mui/material';
import ForestIcon from '@mui/icons-material/Forest';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { m, AnimatePresence } from 'framer-motion';
import CompraMaderaTable from './CompraMaderaTable';
import ConsumibleTable from './ConsumibleTable';
import { useAuth } from '../../../gestion_usuarios/context/AuthContext';

type GastosTab = 'MADERA' | 'CONSUMOS';

const panelVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.18, ease: 'easeIn' } },
};

interface Props {
  bodegaId?: number;
  temporadaId?: number;
}

const GastosPageContent: React.FC<Props> = ({ bodegaId, temporadaId }) => {
  const theme = useTheme();
  const { hasPerm } = useAuth();
  const [tab, setTab] = useState<GastosTab>('MADERA');
  const canViewMadera = hasPerm('view_compramadera');
  const canViewConsumibles = hasPerm('view_consumible');
  const handleTabChange = (_: React.SyntheticEvent, nextTab: GastosTab) => {
    if (nextTab === 'MADERA' && !canViewMadera) return;
    if (nextTab === 'CONSUMOS' && !canViewConsumibles) return;
    setTab(nextTab);
  };

  React.useEffect(() => {
    if (tab === 'MADERA' && !canViewMadera && canViewConsumibles) {
      setTab('CONSUMOS');
    }
    if (tab === 'CONSUMOS' && !canViewConsumibles && canViewMadera) {
      setTab('MADERA');
    }
  }, [tab, canViewMadera, canViewConsumibles]);

  return (
    <Box>
      {/* Header de sección */}
      <Box mb={2}>
        <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
          Gastos de Bodega
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.25}>
          Compras de cajas de madera y materiales consumibles de la temporada
        </Typography>
      </Box>

      {/* Sub-tabs */}
      <Tabs
        value={tab}
        onChange={handleTabChange}
        TabIndicatorProps={{
          style: { height: 2, borderRadius: '2px 2px 0 0', backgroundColor: theme.palette.primary.main },
        }}
        sx={{
          mb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: theme.palette.text.secondary,
            px: 2.5,
            '&.Mui-selected': { color: theme.palette.primary.main, fontWeight: 700 },
          },
        }}
      >
        <Tab
          value="MADERA"
          label="Compras de Madera"
          icon={<ForestIcon fontSize="small" />}
          iconPosition="start"
          aria-disabled={!canViewMadera}
          title={canViewMadera ? undefined : 'No tienes permiso para consultar compras de madera'}
          sx={{ opacity: canViewMadera ? 1 : 0.42, cursor: canViewMadera ? 'pointer' : 'not-allowed' }}
        />
        <Tab
          value="CONSUMOS"
          label="Consumibles"
          icon={<ShoppingCartIcon fontSize="small" />}
          iconPosition="start"
          aria-disabled={!canViewConsumibles}
          title={canViewConsumibles ? undefined : 'No tienes permiso para consultar consumibles'}
          sx={{ opacity: canViewConsumibles ? 1 : 0.42, cursor: canViewConsumibles ? 'pointer' : 'not-allowed' }}
        />
      </Tabs>

      {!canViewMadera && !canViewConsumibles && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          No tienes permisos para consultar gastos de bodega.
        </Alert>
      )}

      {/* Panel */}
      <AnimatePresence mode="wait" initial={false}>
        <Box
          key={tab}
          component={m.div}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {tab === 'MADERA' && canViewMadera
            ? <CompraMaderaTable bodegaId={bodegaId} temporadaId={temporadaId} />
            : tab === 'CONSUMOS' && canViewConsumibles
              ? <ConsumibleTable bodegaId={bodegaId} temporadaId={temporadaId} />
              : null
          }
        </Box>
      </AnimatePresence>
    </Box>
  );
};

export default GastosPageContent;
