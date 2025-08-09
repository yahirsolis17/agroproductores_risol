// src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx
// (lo dejamos como indicas: converge inversiones/ventas; breadcrumbs OK)
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Paper, Typography, Box, CircularProgress, Divider, Tabs, Tab,
} from '@mui/material';
import { motion } from 'framer-motion';

import { temporadaService } from '../services/temporadaService';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

import Inversion from './Inversion';
import Venta     from './Venta';

const FinanzasPorCosecha: React.FC = () => {
  const dispatch = useDispatch();

  const {
    temporadaId: tmp,
    cosechaId:  ctm,
  } = useParams<{ temporadaId: string; cosechaId: string }>();

  const temporadaId = Number(tmp) || null;
  const cosechaId   = Number(ctm) || null;

  const [tempInfo, setTempInfo] = useState<{
    año: number;
    huerta: number;
    huerta_nombre: string;
    is_active: boolean;
    finalizada: boolean;
  } | null>(null);
  const [loadingTemp, setLoadingTemp] = useState(false);

  useEffect(() => {
    if (!temporadaId) {
      dispatch(clearBreadcrumbs());
      setTempInfo(null);
      return;
    }
    setLoadingTemp(true);
    temporadaService.getById(temporadaId)
      .then(res => {
        const t = res.data.temporada;
        const huertaId = t.huerta ?? t.huerta_rentada!;
        setTempInfo({
          año: t.año,
          huerta: huertaId,
          huerta_nombre: t.huerta_nombre!,
          is_active: t.is_active,
          finalizada: t.finalizada,
        });
        dispatch(setBreadcrumbs([
          ...breadcrumbRoutes.cosechasList(huertaId, t.huerta_nombre!, t.año, temporadaId!),
          { label: 'Ventas & Inversiones', path: '' }
        ]));
      })
      .catch(() => {
        dispatch(clearBreadcrumbs());
        setTempInfo(null);
      })
      .finally(() => setLoadingTemp(false));
  }, [temporadaId, dispatch]);

  if (!cosechaId) {
    return (
      <Box p={4}>
        <Typography>Selecciona una cosecha primero.</Typography>
      </Box>
    );
  }

  const [tab, setTab] = useState<'inversion' | 'venta'>('inversion');

  return (
    <motion.div
      className="p-6 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Paper elevation={4} className="p-6 bg-white rounded-2xl">
        <Typography variant="h4" gutterBottom>
          Finanzas por Cosecha
        </Typography>

        {loadingTemp ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : tempInfo ? (
          <Box mb={2}>
            <Typography>
              Temporada {tempInfo.año} – {tempInfo.huerta_nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estado:{' '}
              {tempInfo.is_active ? 'Activa' : 'Archivada'} ·{' '}
              {tempInfo.finalizada ? 'Finalizada' : 'En curso'}
            </Typography>
            <Divider sx={{ mt: 1 }} />
          </Box>
        ) : null}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab value="inversion" label="Inversiones" />
          <Tab value="venta" label="Ventas" />
        </Tabs>

        {tab === 'inversion' ? <Inversion /> : <Venta />}
      </Paper>
    </motion.div>
  );
};

export default FinanzasPorCosecha;
