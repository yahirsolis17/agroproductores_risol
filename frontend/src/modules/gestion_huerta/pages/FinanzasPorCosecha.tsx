// src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, Box, CircularProgress, Divider, Tabs, Tab, Button } from '@mui/material';
import { motion } from 'framer-motion';

import { useAppDispatch } from '../../../global/store/store';
import { temporadaService } from '../services/temporadaService';
import { cosechaService } from '../services/cosechaService';
import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { joinDisplayParts } from '../../../global/utils/uiTransforms';
import { setBreadcrumbs, clearBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';

import { setContext as setInvContext } from '../../../global/store/inversionesSlice';
import { setContext as setVentaContext } from '../../../global/store/ventasSlice';

import Inversion from './Inversion';
import Venta     from './Venta';
import { Cosecha } from '../types/cosechaTypes';

type UrlParams = { temporadaId: string; cosechaId: string };

type TempInfo = {
  año: number;
  huertaId: number | null;
  huertaRentadaId: number | null;
  huerta_nombre: string;
  propietario: string;            // ← agregado
  tipo: 'propia' | 'rentada' | null; // ← agregado (inferido o de query)
  is_active: boolean;
  finalizada: boolean;
};

type CtxPayload = {
  temporadaId: number;
  cosechaId: number;
  huertaId?: number;
  huertaRentadaId?: number;
};

const FinanzasPorCosecha: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { temporadaId: tmp, cosechaId: ctm } = useParams<UrlParams>();
  const temporadaId = Number(tmp) || null;
  const cosechaId   = Number(ctm) || null;

  const [search] = useSearchParams();
  const tipoFromQS = (search.get('tipo') as 'propia' | 'rentada' | null) || null;
  const propietarioQS = search.get('propietario') || '';
  const huertaNombreQS = search.get('huerta_nombre') || '';

  const [tempInfo, setTempInfo] = useState<TempInfo | null>(null);
  const [cosechaInfo, setCosechaInfo] = useState<Cosecha | null>(null);
  const [loadingTemp, setLoadingTemp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<'inversion' | 'venta'>('inversion');

  // Limpieza breadcrumbs al desmontar
  useEffect(() => {
    return () => { dispatch(clearBreadcrumbs()); };
  }, [dispatch]);

  // Carga de temporada + cosecha + encabezado + breadcrumbs
  useEffect(() => {
    let cancelled = false;

    if (!temporadaId || !cosechaId) {
      dispatch(clearBreadcrumbs());
      setTempInfo(null);
      setCosechaInfo(null);
      return;
    }

    (async () => {
      try {
        setLoadingTemp(true);
        setLoadError(null);
        const [t, c] = await Promise.all([
          temporadaService.getById(temporadaId),
          cosechaService.getById(cosechaId),
        ]);
        if (cancelled) return;

        const huertaId        = t.huerta ?? null;
        const huertaRentadaId = t.huerta_rentada ?? null;
        const inferredTipo: 'propia' | 'rentada' | null =
          tipoFromQS || (huertaId ? 'propia' : huertaRentadaId ? 'rentada' : null);

        // nombre base (preferir el que viene en la temporada; si no, QS)
        const nombre = (t.huerta_nombre || huertaNombreQS || '').trim();

        // propietario: si viene en QS lo usamos; si no, resolver con fetch
        let propietario = (propietarioQS || '').trim();

        if (!propietario) {
          try {
            if (huertaId && inferredTipo === 'propia') {
              const h = await huertaService.getById(huertaId);
              const det: any = h.data.huerta.propietario_detalle;
              if (det) propietario = joinDisplayParts([det.nombre, det.apellidos]).trim() || '—';
            } else if (huertaRentadaId && inferredTipo === 'rentada') {
              const hr = await huertaRentadaService.getById(huertaRentadaId);
              const det: any = hr.data.huerta_rentada.propietario_detalle;
              if (det) propietario = joinDisplayParts([det.nombre, det.apellidos]).trim() || '—';
            }
          } catch {
            // silencioso; propietario quedará vacío/guion si no se pudo
          }
        }

        if (!huertaId && !huertaRentadaId) {
          setLoadError('No se pudo determinar el origen de la huerta.');
          setTempInfo(null);
          setCosechaInfo(null);
          dispatch(clearBreadcrumbs());
          return;
        }

        const info: TempInfo = {
          año: t.año,
          huertaId,
          huertaRentadaId,
          huerta_nombre: nombre,
          propietario: propietario || '—',
          tipo: inferredTipo,
          is_active: t.is_active,
          finalizada: t.finalizada,
        };

        const cosechaTemporadaId = c.temporada ?? null;
        if (cosechaTemporadaId && cosechaTemporadaId !== t.id) {
          setLoadError('La cosecha seleccionada no pertenece a esta temporada.');
          setTempInfo(null);
          setCosechaInfo(null);
          dispatch(clearBreadcrumbs());
          return;
        }

        setTempInfo(info);
        setCosechaInfo(c);

        // Breadcrumbs: Huertas → Temporadas → Cosechas → Ventas & Inversiones
        const origenId = huertaId ?? huertaRentadaId!;
        dispatch(setBreadcrumbs([
          ...breadcrumbRoutes.cosechasList(
            origenId,
            info.huerta_nombre || `Huerta #${origenId}`,
            info.año,
            temporadaId,
            { tipo: info.tipo || undefined, propietario: info.propietario || undefined }
          ),
          { label: 'Ventas & Inversiones', path: '' },
        ]));
      } catch {
        if (!cancelled) {
          dispatch(clearBreadcrumbs());
          setTempInfo(null);
          setCosechaInfo(null);
          setLoadError('No se pudo cargar la temporada o la cosecha.');
        }
      } finally {
        if (!cancelled) setLoadingTemp(false);
      }
    })();

    return () => { cancelled = true; };
  }, [temporadaId, cosechaId, dispatch, tipoFromQS, propietarioQS, huertaNombreQS]);

  // Inyectar contexto de inversiones y ventas
  useEffect(() => {
    if (!temporadaId || !cosechaId || !tempInfo || !cosechaInfo) return;

    const payload: CtxPayload = {
      temporadaId,
      cosechaId,
      ...(tempInfo.huertaId != null
        ? { huertaId: tempInfo.huertaId }
        : { huertaRentadaId: tempInfo.huertaRentadaId ?? undefined })
    };

    dispatch(setInvContext(payload));
    dispatch(setVentaContext(payload));
  }, [temporadaId, cosechaId, tempInfo, cosechaInfo, dispatch]);

  if (!temporadaId || !cosechaId) {
    return (
      <Box p={4}>
        <Typography>Selecciona una temporada y una cosecha primero.</Typography>
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/cosechas')}>
            Volver a Cosechas
          </Button>
        </Box>
      </Box>
    );
  }

  const hasContext = Boolean(tempInfo && cosechaInfo);
  const temporadaState = tempInfo ? { is_active: tempInfo.is_active, finalizada: tempInfo.finalizada } : null;
  const cosechaState = cosechaInfo ? { is_active: cosechaInfo.is_active, finalizada: cosechaInfo.finalizada } : null;

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Paper elevation={4} className="p-6 bg-white rounded-2xl">
        <Typography variant="h4" gutterBottom>Finanzas por Cosecha</Typography>

        {loadingTemp ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : loadError ? (
          <Box mb={2}>
            <Typography color="error">{loadError}</Typography>
            <Box mt={2}>
              <Button variant="contained" onClick={() => navigate('/cosechas')}>
                Volver a Cosechas
              </Button>
            </Box>
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

        {!loadingTemp && !loadError && (
          <>
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

            {tab === 'inversion'
              ? <Inversion temporadaState={temporadaState} cosechaState={cosechaState} hasContext={hasContext} />
              : <Venta temporadaState={temporadaState} cosechaState={cosechaState} hasContext={hasContext} />}
          </>
        )}
      </Paper>
    </motion.div>
  );
};

export default FinanzasPorCosecha;
