/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { m } from 'framer-motion';
import { useSearchParams, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { PermissionButton } from '../../../components/common/PermissionButton';
import { breadcrumbRoutes } from '../../../global/constants/breadcrumbRoutes';
import { clearBreadcrumbs, setBreadcrumbs } from '../../../global/store/breadcrumbsSlice';
import { joinDisplayParts } from '../../../global/utils/uiTransforms';
import { formatDateLongEs } from '../../../global/utils/date';
import { huertaService } from '../services/huertaService';
import { huertaRentadaService } from '../services/huertaRentadaService';
import { categoriaPreCosechaService } from '../services/categoriaPreCosechaService';
import { precosechaService } from '../services/precosechaService';
import { temporadaService } from '../services/temporadaService';
import CategoriaPreCosechaFormModal from '../components/precosecha/CategoriaPreCosechaFormModal';
import PreCosechaFormModal from '../components/precosecha/PreCosechaFormModal';
import PreCosechaTable from '../components/precosecha/PreCosechaTable';
import { CategoriaPreCosecha } from '../types/categoriaPreCosechaTypes';
import { PreCosecha, PreCosechaCreateData, PreCosechaUpdateData } from '../types/precosechaTypes';
import { Temporada } from '../types/temporadaTypes';

type HeaderInfo = {
  nombre: string;
  propietario: string;
  isActive: boolean;
};

const PAGE_SIZE = 10;

const dayBefore = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatFechaLarga = (iso?: string | null) => (iso ? formatDateLongEs(iso) : '—');

const PreCosechasPage: React.FC = () => {
  const dispatch = useDispatch();
  const { temporadaId } = useParams<{ temporadaId: string }>();
  const temporadaIdNum = Number(temporadaId || 0);
  const [search] = useSearchParams();

  const huertaId = Number(search.get('huerta_id') || 0) || null;
  const tipo = (search.get('tipo') as 'propia' | 'rentada' | null) || null;
  const huertaNombreParam = search.get('huerta_nombre') || '';
  const propietarioParam = search.get('propietario') || '';
  const anioParam = Number(search.get('anio') || 0) || null;

  const [temporada, setTemporada] = useState<Temporada | null>(null);
  const [headerInfo, setHeaderInfo] = useState<HeaderInfo | null>(null);
  const [categorias, setCategorias] = useState<CategoriaPreCosecha[]>([]);
  const [items, setItems] = useState<PreCosecha[]>([]);
  const [loading, setLoading] = useState(true);
  const [uiError, setUiError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [metaPageSize, setMetaPageSize] = useState<number | null>(PAGE_SIZE);
  const [estado, setEstado] = useState<'activas' | 'archivadas' | 'todas'>('activas');
  const [categoriaFilter, setCategoriaFilter] = useState<number | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PreCosecha | null>(null);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PreCosecha | null>(null);

  const displayHuertaNombre = headerInfo?.nombre || huertaNombreParam || temporada?.huerta_nombre || '';
  const displayPropietario = headerInfo?.propietario || propietarioParam || '—';

  const canMutate = Boolean(
    temporada &&
      temporada.is_active &&
      !temporada.finalizada &&
      temporada.estado_operativo === 'planificada'
  );

  const maxFecha = useMemo(() => {
    if (!temporada?.fecha_inicio) return '';
    return dayBefore(temporada.fecha_inicio);
  }, [temporada?.fecha_inicio]);

  const categoriesMap = useMemo<Record<number, string>>(
    () => Object.fromEntries(categorias.map((cat) => [cat.id, cat.nombre])),
    [categorias]
  );

  const fetchCategorias = async () => {
    const response = await categoriaPreCosechaService.listAll(1, 1000);
    setCategorias(response.data.results);
  };

  const fetchItems = async (targetPage = page) => {
    if (!temporadaIdNum) return;
    setLoading(true);
    try {
      const response = await precosechaService.list({
        page: targetPage,
        temporadaId: temporadaIdNum,
        categoriaId: typeof categoriaFilter === 'number' ? categoriaFilter : undefined,
        estado,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        search: searchFilter || undefined,
      });
      setItems(response.data.results);
      setCount(response.data.meta.count);
      setMetaPageSize(response.data.meta.page_size);
      setPage(targetPage);
      setUiError(null);
    } catch {
      setUiError('No se pudieron cargar los registros de PreCosecha.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!temporadaIdNum) return;
      setLoading(true);
      try {
        const [temporadaData] = await Promise.all([
          temporadaService.getById(temporadaIdNum),
          fetchCategorias(),
        ]);
        if (cancelled) return;
        setTemporada(temporadaData);
      } catch {
        if (!cancelled) setUiError('No se pudo cargar la temporada.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [temporadaIdNum]);

  useEffect(() => {
    if (!temporadaIdNum || !temporada) return;
    fetchItems(1);
  }, [temporadaIdNum, temporada?.id, estado, categoriaFilter, fechaDesde, fechaHasta, searchFilter]);

  useEffect(() => {
    let cancelled = false;
    const fetchHeader = async () => {
      if (!huertaId || !tipo) return;
      try {
        if (tipo === 'propia') {
          const huertaObj = await huertaService.getById(huertaId);
          if (cancelled) return;
          setHeaderInfo({
            nombre: huertaObj.nombre || huertaNombreParam || `#${huertaId}`,
            propietario:
              (huertaObj.propietario_detalle
                ? joinDisplayParts([huertaObj.propietario_detalle.nombre, huertaObj.propietario_detalle.apellidos])
                : '') || propietarioParam || '—',
            isActive: Boolean(huertaObj.is_active),
          });
        } else {
          const huertaObj = await huertaRentadaService.getById(huertaId);
          if (cancelled) return;
          setHeaderInfo({
            nombre: huertaObj.nombre || huertaNombreParam || `#${huertaId}`,
            propietario:
              (huertaObj.propietario_detalle
                ? joinDisplayParts([huertaObj.propietario_detalle.nombre, huertaObj.propietario_detalle.apellidos])
                : '') || propietarioParam || '—',
            isActive: Boolean(huertaObj.is_active),
          });
        }
      } catch {
        if (!cancelled) setHeaderInfo(null);
      }
    };
    fetchHeader();
    return () => {
      cancelled = true;
    };
  }, [huertaId, tipo, huertaNombreParam, propietarioParam]);

  useEffect(() => {
    if (!temporadaIdNum || !temporada) return;
    dispatch(
      setBreadcrumbs(
        breadcrumbRoutes.precosechasList(
          huertaId || temporada.huerta_id || 0,
          displayHuertaNombre,
          anioParam || temporada.año,
          temporadaIdNum,
          { tipo: tipo || undefined, propietario: displayPropietario !== '—' ? displayPropietario : undefined }
        )
      )
    );
    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch, temporadaIdNum, temporada, huertaId, displayHuertaNombre, displayPropietario, anioParam, tipo]);

  const handleSubmit = async (values: PreCosechaCreateData | PreCosechaUpdateData) => {
    if (editTarget) {
      await precosechaService.update(editTarget.id, values as PreCosechaUpdateData);
    } else {
      await precosechaService.create(values as PreCosechaCreateData);
    }
    setEditTarget(null);
    await fetchItems(page);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await precosechaService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await fetchItems(page);
    } catch {
      setUiError('No se pudo eliminar la PreCosecha.');
    }
  };

  return (
    <m.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <Paper elevation={4} className="p-6 sm:p-10 rounded-2xl bg-white">
        <Typography variant="h4" className="text-primary-dark font-bold mb-2">
          PreCosecha / Preparación de temporada
        </Typography>
        {uiError && <Typography color="error" sx={{ mb: 2 }}>{uiError}</Typography>}

        {temporada && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Temporada destino: {temporada.año} · {temporada.estado_operativo === 'planificada' ? 'Planificada' : 'Operativa'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Huerta: {displayHuertaNombre || `#${huertaId}`} · Propietario: {displayPropietario}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inicio operativo: {formatFechaLarga(temporada.fecha_inicio)}
            </Typography>
            <Divider sx={{ mt: 1 }} />
          </Box>
        )}

        {temporada && (
          <Alert severity={canMutate ? 'info' : 'warning'} sx={{ mb: 2 }}>
            {canMutate
              ? 'Registra aquí solo gastos de preparación que pertenecen financieramente a la temporada futura.'
              : 'La temporada ya es operativa o está cerrada. La PreCosecha queda en solo lectura.'}
          </Alert>
        )}

        <Tabs value={estado} onChange={(_, value) => setEstado(value)} textColor="primary" indicatorColor="primary" sx={{ mb: 2 }}>
          <Tab value="activas" label="Activas" />
          <Tab value="archivadas" label="Archivadas" />
          <Tab value="todas" label="Todas" />
        </Tabs>

        <Box display="flex" flexWrap="wrap" gap={2} mb={3} alignItems="center">
          <TextField
            size="small"
            label="Buscar"
            placeholder="Descripción"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            sx={{ minWidth: 220, flexGrow: 1 }}
          />
          <TextField
            size="small"
            select
            label="Categoría"
            value={categoriaFilter}
            onChange={(event) => setCategoriaFilter(event.target.value === '' ? '' : Number(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categorias.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Desde"
            type="date"
            value={fechaDesde}
            onChange={(event) => setFechaDesde(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="Hasta"
            type="date"
            value={fechaHasta}
            onChange={(event) => setFechaHasta(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Tooltip title={canMutate ? '' : 'La temporada ya es operativa; PreCosecha está en solo lectura.'}>
            <span>
              <PermissionButton
                perm="add_precosecha"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setEditTarget(null); setModalOpen(true); }}
                disabled={!canMutate}
              >
                Nueva PreCosecha
              </PermissionButton>
            </span>
          </Tooltip>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <PreCosechaTable
            data={items}
            page={page}
            pageSize={metaPageSize ?? PAGE_SIZE}
            metaPageSize={metaPageSize}
            count={count}
            onPageChange={fetchItems}
            onEdit={(item) => {
              setEditTarget(item);
              setModalOpen(true);
            }}
            onConsult={(item) => {
              setEditTarget(item);
              setConsultOpen(true);
            }}
            onArchive={async (id) => {
              try {
                await precosechaService.archivar(id);
                await fetchItems(page);
              } catch {
                setUiError('No se pudo archivar la PreCosecha.');
              }
            }}
            onRestore={async (id) => {
              try {
                await precosechaService.restaurar(id);
                await fetchItems(page);
              } catch {
                setUiError('No se pudo restaurar la PreCosecha.');
              }
            }}
            onDelete={(id) => {
              const target = items.find((item) => item.id === id) || null;
              setDeleteTarget(target);
            }}
            categoriesMap={categoriesMap}
            loading={loading}
            readOnly={!canMutate}
          />
        )}

        {temporada && (
          <PreCosechaFormModal
            open={modalOpen}
            onClose={() => {
              setEditTarget(null);
              setModalOpen(false);
            }}
            onSubmit={handleSubmit}
            categorias={categorias}
            temporadaId={temporada.id}
            maxFecha={maxFecha}
            initialValues={editTarget ?? undefined}
            onCreateCategoria={() => setCategoriaModalOpen(true)}
          />
        )}

        {temporada && (
          <PreCosechaFormModal
            open={consultOpen}
            onClose={() => {
              setEditTarget(null);
              setConsultOpen(false);
            }}
            onSubmit={async () => undefined}
            categorias={categorias}
            temporadaId={temporada.id}
            maxFecha={maxFecha}
            initialValues={editTarget ?? undefined}
            onCreateCategoria={() => undefined}
            readOnly
          />
        )}

        <CategoriaPreCosechaFormModal
          open={categoriaModalOpen}
          onClose={() => setCategoriaModalOpen(false)}
          onSuccess={async (cat) => {
            setCategoriaModalOpen(false);
            setCategorias((prev) => [cat, ...prev].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
          }}
        />

        <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>¿Eliminar esta PreCosecha permanentemente?</DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button color="error" onClick={handleDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </m.div>
  );
};

export default PreCosechasPage;
