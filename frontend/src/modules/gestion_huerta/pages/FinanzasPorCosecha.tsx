// src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Paper, Typography, Box, CircularProgress, Divider, Tabs, Tab } from '@mui/material';
import { motion } from 'framer-motion';

import { useAppDispatch } from '../../../global/store/store';
import { temporadaService } from '../services/temporadaService';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

import { setContext as setInvContext } from '../../../global/store/inversionesSlice';
import { setContext as setVentaContext } from '../../../global/store/ventasSlice';

import Inversion from './Inversion';
import Venta     from './Venta';

type UrlParams = { temporadaId: string; cosechaId: string };

type TempInfo = {
  año: number;
  huertaId: number | null;
  huertaRentadaId: number | null;
  huerta_nombre: string;
  is_active: boolean;
  finalizada: boolean;
};

type CtxPayload = {
  temporadaId: number;
  cosechaId: number;
  huertaId?: number;          // opcional (sin null)
  huertaRentadaId?: number;   // opcional (sin null)
};

const FinanzasPorCosecha: React.FC = () => {
  const dispatch = useAppDispatch();

  const { temporadaId: tmp, cosechaId: ctm } = useParams<UrlParams>();
  const temporadaId = Number(tmp) || null;
  const cosechaId   = Number(ctm) || null;

  const [tempInfo, setTempInfo] = useState<TempInfo | null>(null);
  const [loadingTemp, setLoadingTemp] = useState(false);
  const [tab, setTab] = useState<'inversion' | 'venta'>('inversion');

  // Limpieza breadcrumbs al desmontar
  useEffect(() => {
    return () => { dispatch(clearBreadcrumbs()); };
  }, [dispatch]);

  // Carga de temporada + breadcrumbs
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
        const huertaId        = t.huerta ?? null;
        const huertaRentadaId = t.huerta_rentada ?? null;

        const info: TempInfo = {
          año: t.año,
          huertaId,
          huertaRentadaId,
          huerta_nombre: t.huerta_nombre || '',
          is_active: t.is_active,
          finalizada: t.finalizada,
        };
        setTempInfo(info);

        const origenId = huertaId ?? huertaRentadaId!;
        dispatch(setBreadcrumbs([
          ...breadcrumbRoutes.cosechasList(
            origenId,
            info.huerta_nombre,
            info.año,
            temporadaId,
            huertaRentadaId ? 'rentada' : 'propia'
          ),
          { label: 'Ventas & Inversiones', path: '' }
        ]));
      })
      .catch(() => {
        dispatch(clearBreadcrumbs());
        setTempInfo(null);
      })
      .finally(() => setLoadingTemp(false));
  }, [temporadaId, dispatch]);

  // Inyectar contexto de inversiones y ventas
  useEffect(() => {
    if (!temporadaId || !cosechaId || !tempInfo) return;

    // Construimos payload SOLO con el origen válido; nada de nulls
    const payload: CtxPayload = {
      temporadaId,
      cosechaId,
      ...(tempInfo.huertaId != null
        ? { huertaId: tempInfo.huertaId }
        : tempInfo.huertaRentadaId != null
          ? { huertaRentadaId: tempInfo.huertaRentadaId }
          : {})
    };

    dispatch(setInvContext(payload));
    dispatch(setVentaContext(payload));
  }, [temporadaId, cosechaId, tempInfo, dispatch]);

  if (!cosechaId) {
    return (
      <Box p={4}>
        <Typography>Selecciona una cosecha primero.</Typography>
      </Box>
    );
  }

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Paper elevation={4} className="p-6 bg-white rounded-2xl">
        <Typography variant="h4" gutterBottom>Finanzas por Cosecha</Typography>

        {loadingTemp ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : tempInfo ? (
          <Box mb={2}>
            <Typography>Temporada {tempInfo.año} – {tempInfo.huerta_nombre}</Typography>
            <Typography variant="body2" color="text.secondary">
              Estado: {tempInfo.is_active ? 'Activa' : 'Archivada'} · {tempInfo.finalizada ? 'Finalizada' : 'En curso'}
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
