import { useEffect, useMemo, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";

import CapturasTable from "../../../modules/gestion_bodega/components/capturas/CapturasTable";
import RecepcionFormModal from "../../../modules/gestion_bodega/components/capturas/RecepcionFormModal";
import CapturasToolbar from "../../../modules/gestion_bodega/components/capturas/CapturasToolbar";
import RulesBanner from "../../../modules/gestion_bodega/components/capturas/RulesBanner";
import FastCaptureModal from "../../../modules/gestion_bodega/components/capturas/FastCaptureModal";

import useCapturas from "../../../modules/gestion_bodega/hooks/useCapturas";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setBreadcrumbs, clearBreadcrumbs } from "../../../global/store/breadcrumbsSlice";
import { breadcrumbRoutes } from "../../../global/constants/breadcrumbRoutes";
import { bodegaService } from "../services/bodegaService";
import temporadaBodegaService from "../services/temporadaBodegaService";
import { getWeekCurrent } from "../../../modules/gestion_bodega/services/tableroBodegaService";

import type {
  Captura,
  CapturaCreateDTO,
  CapturaUpdateDTO,
} from "../../../modules/gestion_bodega/types/capturasTypes";

export default function CapturasPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { bodegaId: bodegaIdParam } = useParams();

  const {
    items,
    meta,
    filters,
    loading,
    create,
    update,
    archivar,
    restaurar,
    remove,
    setPage,
    canOperate,
    reasonDisabled,
    setBodega,
    setTemporada,
    setPageSize,
    refetch,
  } = useCapturas() as any;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Captura | null>(null);
  const [fastOpen, setFastOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // 1) Hidratación de contexto desde ruta/query + breadcrumbs mínimos
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const bFromQuery = Number(searchParams.get("bodega") || "") || undefined;
    const bFromPath = bodegaIdParam ? Number(bodegaIdParam) : undefined;
    const b = bFromPath || bFromQuery;
    const t = Number(searchParams.get("temporada") || "") || undefined;

    const page = Number(searchParams.get("page") || "") || undefined;
    const pageSize = Number(searchParams.get("page_size") || "") || undefined;

    if (b && b !== filters.bodega) setBodega(b);
    if (t && t !== filters.temporada) setTemporada(t);
    if (page) setPage(page);
    if (pageSize) setPageSize(pageSize);

    dispatch(
      setBreadcrumbs([
        { label: "Bodegas", path: "/bodega" },
        { label: "Capturas", path: "" },
      ])
    );
    return () => {
      dispatch(clearBreadcrumbs());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // 2) Enriquecer breadcrumbs con nombres reales (fetch liviano)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const bId = filters.bodega;
    const tId = filters.temporada;
    if (!bId || !tId) return;
    let cancelled = false;
    (async () => {
      try {
        const [bodega, temporada] = await Promise.all([bodegaService.getById(bId), temporadaBodegaService.getById(tId)]);
        if (cancelled) return;
        const nombre = bodega?.nombre || `Bodega #${bId}`;
        const anio = (temporada as any)?.["año"] ?? new Date().getFullYear();
        const crumbs = breadcrumbRoutes.bodegaCapturas(String(bId), nombre, String(tId), Number(anio));
        dispatch(setBreadcrumbs(crumbs));
      } catch {
        /* breadcrumb mínimo ya seteado */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, filters.bodega, filters.temporada]);

  // ─────────────────────────────────────────────────────────────────
  // 3) Persistir filtros en la URL
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.bodega) params.set("bodega", String(filters.bodega));
    if (filters.temporada) params.set("temporada", String(filters.temporada));
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    setSearchParams(params, { replace: true });
  }, [filters.bodega, filters.temporada, filters.page, filters.page_size, setSearchParams]);

  // ─────────────────────────────────────────────────────────────────
  // 4) Estado de semana actual (para bloquear acciones si está cerrada)
  // ─────────────────────────────────────────────────────────────────
  const [isActiveWeek, setIsActiveWeek] = useState<boolean | null>(null);
  const [weekRange, setWeekRange] = useState<{ from?: string; to?: string } | undefined>(undefined);

  const refetchWeekState = useCallback(async () => {
    const bId = filters.bodega;
    const tId = filters.temporada;
    if (!bId || !tId) return;
    try {
      const s = await getWeekCurrent(tId, bId);
      const wk = (s as any)?.week || null;
      setIsActiveWeek(!!wk?.activa);
      setWeekRange(
        wk?.fecha_desde && wk?.fecha_hasta
          ? { from: wk.fecha_desde, to: wk.fecha_hasta }
          : undefined
      );
    } catch {
      // si falla, no bloqueamos por FE; el BE seguirá validando
      setIsActiveWeek(null);
      setWeekRange(undefined);
    }
  }, [filters.bodega, filters.temporada]);

  useEffect(() => {
    refetchWeekState();
  }, [refetchWeekState]);

  // ─────────────────────────────────────────────────────────────────
  // 5) Carga inicial/recargas al tener contexto válido
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (filters.bodega && filters.temporada) {
      refetch(); // trae la primera página con el contexto actual
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.bodega, filters.temporada]);

  // Paginación → setPage + refetch
  const handlePageChange = useCallback(
    (n: number) => {
      setPage(n);
      refetch();
    },
    [setPage, refetch]
  );

  // ─────────────────────────────────────────────────────────────────
  // 6) Handlers CRUD (con refetch post-acción)
  // ─────────────────────────────────────────────────────────────────
  const handleCreate = async (payload: CapturaCreateDTO) => {
    await create(payload);
    await refetch();
  };

  const handleUpdate = async (id: number, payload: CapturaUpdateDTO) => {
    await update(id, payload);
    await refetch();
  };

  const handleArchive = async (row: Captura) => {
    await archivar(row.id);
    await refetch();
  };

  const handleRestore = async (row: Captura) => {
    await restaurar(row.id);
    await refetch();
  };

  const handleDelete = async (row: Captura) => {
    await remove(row.id);
    await refetch();
  };

  // ─────────────────────────────────────────────────────────────────
  // 7) Reglas de bloqueo y razones (UX homogénea con Tablero)
  // ─────────────────────────────────────────────────────────────────
  const recepDisabled = useMemo(() => {
    // Bloquea si no hay contexto o si el backend reporta semana cerrada
    if (!canOperate) return true;
    if (isActiveWeek === null) return false; // desconocido → no bloqueamos por FE
    return !isActiveWeek;
  }, [canOperate, isActiveWeek]);

  const recepReason = useMemo(() => {
    if (!canOperate) return reasonDisabled || "Selecciona bodega y temporada.";
    if (isActiveWeek === null) return ""; // desconocido
    return !isActiveWeek ? "Semana cerrada o no iniciada." : "";
  }, [canOperate, reasonDisabled, isActiveWeek]);

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Paper elevation={3} className="p-6 sm:p-8 rounded-2xl bg-white">
          {/* Banner de reglas (coherente con Tablero) */}
          <RulesBanner blocked={recepDisabled} reason={recepReason} range={weekRange} />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h4" className="font-bold">
              Recepciones
            </Typography>

            <CapturasToolbar
              bodegaId={filters.bodega}
              temporadaId={filters.temporada}
              onNewRecepcion={() => {
                setEditing(null);
                setOpen(true);
              }}
              busy={loading}
              disabledActions={recepDisabled}
              disabledReason={recepReason}
            />
          </Stack>

          <Divider className="mb-2" />

          {/* Texto “Bodega # / Temporada #” eliminado por ser redundante en el nuevo flujo */}

          <CapturasTable
            items={items}
            meta={meta}
            loading={loading}
            onPageChange={handlePageChange}
            onEdit={(row) => {
              setEditing(row);
              setOpen(true);
            }}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onDelete={handleDelete}
            blocked={recepDisabled}
            onClassify={(row) => {
              const bId = filters.bodega ?? "";
              const params = new URLSearchParams();
              if (filters.temporada) params.set("temporada", String(filters.temporada));
              if (filters.page) params.set("page", String(filters.page));
              if (filters.page_size) params.set("page_size", String(filters.page_size));
              navigate(`/bodega/${bId}/capturas/${row.id}/clasificacion?${params.toString()}`);
            }}
          />
        </Paper>
      </Stack>

      {/* Crear / Editar */}
      <RecepcionFormModal
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        bodegaId={filters.bodega}
        temporadaId={filters.temporada}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Captura rápida (opcional). Si deseas quitarla de esta página, elimina el bloque completo. */}
      <FastCaptureModal
        open={fastOpen}
        onClose={() => setFastOpen(false)}
        bodegaId={filters.bodega as any}
        temporadaId={filters.temporada as any}
        disabled={recepDisabled}
        onCreate={async (payload) => {
          await create({
            bodega: filters.bodega as number,
            temporada: filters.temporada as number,
            fecha: payload.fecha,
            huertero_nombre: payload.huertero_nombre || "",
            tipo_mango: payload.tipo_mango,
            cantidad_cajas: payload.cantidad_cajas,
            observaciones: payload.observaciones || null,
          });
          await refetch();
        }}
      />
    </Box>
  );
}
