// src/modules/gestion_huerta/components/common/ActionsMenu.tsx
import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { shallowEqual, useSelector } from 'react-redux';
import type { RootState } from '../../../../global/store/store';
import { useAuth } from '../../../gestion_usuarios/context/AuthContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaidIcon from '@mui/icons-material/Paid';

type Perm = string | string[] | undefined;

interface ActionsMenuProps {
  isArchived: boolean;
  isFinalized?: boolean;
  onEdit?: () => void;
  onFinalize?: () => void;
  onArchiveOrRestore?: () => void;
  onDelete?: () => void;
  onTemporadas?: () => void;
  hideEdit?: boolean;
  hideDelete?: boolean;
  hideArchiveToggle?: boolean;
  hideFinalize?: boolean;
  hideTemporadas?: boolean;
  labelFinalize?: string;
  labelTemporadas?: string;
  permEdit?: Perm;
  permFinalize?: Perm;
  permArchiveOrRestore?: Perm;
  permDelete?: Perm;
  permTemporadas?: Perm;

  // Navegar a cosechas
  onCosechas?: () => void;
  permCosechas?: Perm;

  // Ver finanzas
  onVerFinanzas?: () => void;
  permVerFinanzas?: Perm;

  // 👉 NUEVOS: reportes
  onReporteCosecha?: () => void;
  permReporteCosecha?: Perm;
  onReporteTemporada?: () => void;
  permReporteTemporada?: Perm;
  onReporteHuerta?: () => void;
  permReporteHuerta?: Perm;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  isArchived,
  isFinalized = false,
  onEdit,
  onFinalize,
  onArchiveOrRestore,
  onDelete,
  onTemporadas,
  hideEdit = false,
  hideDelete = false,
  hideArchiveToggle = false,
  hideFinalize = false,
  hideTemporadas = false,
  labelFinalize,
  labelTemporadas,
  permEdit,
  permFinalize,
  permArchiveOrRestore,
  permDelete,
  permTemporadas,
  onCosechas,
  permCosechas,
  onVerFinanzas,
  permVerFinanzas,

  // reportes
  onReporteCosecha,
  permReporteCosecha,
  onReporteTemporada,
  permReporteTemporada,
  onReporteHuerta,
  permReporteHuerta,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const handle = (fn?: () => void) => {
    closeMenu();
    fn && fn();
  };

  // Permisos: Redux primero; si no hay, cae al Context
  const roleRedux  = useSelector((s: RootState) => s.auth.user?.role, shallowEqual);
  const permsRedux = useSelector((s: RootState) => s.auth.permissions as string[] | undefined, shallowEqual);
  const { user: ctxUser, permissions: ctxPerms /*, refreshPermissions */ } = useAuth();

  const role = roleRedux ?? ctxUser?.role ?? undefined;

  const rawFromRedux = permsRedux ?? [];
  const rawFromCtx   = (ctxPerms ?? []) as string[];
  const raw          = rawFromRedux.length ? rawFromRedux : rawFromCtx;

  const normalized = raw.map(p => (p && p.includes('.')) ? p.split('.').pop()! : p).filter(Boolean) as string[];

  const hasPerm = (perm: Perm) => {
    if (role === 'admin') return true;
    if (!perm) return false; // default seguro: si no se pasa permiso, deshabilita
    const check = (p: string) => normalized.includes(p);
    return Array.isArray(perm) ? perm.some(check) : check(perm);
  };

  return (
    <>
      <Tooltip title="Más acciones">
        <IconButton size="small" onClick={openMenu}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {/* Finalizar / Reactivar (solo si NO está archivada) */}
        {!hideFinalize && !isArchived && onFinalize && (
          (() => {
            const allowed = hasPerm(permFinalize);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onFinalize)}>
                    <ListItemIcon>
                      {isFinalized ? <RestartAltIcon fontSize="small" /> : <DoneAllIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        labelFinalize
                          ? labelFinalize
                          : (isFinalized ? 'Reactivar' : 'Finalizar')
                      }
                    />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Ver Temporadas */}
        {!hideTemporadas && !isArchived && onTemporadas && (
          (() => {
            const allowed = hasPerm(permTemporadas);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onTemporadas)}>
                    <ListItemIcon>
                      <EventNoteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={labelTemporadas ?? 'Temporadas'} />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Ver Cosechas */}
        {!isArchived && onCosechas && (
          (() => {
            const allowed = hasPerm(permCosechas);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onCosechas)}>
                    <ListItemIcon>
                      <AgricultureIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Ver cosechas" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Ver Finanzas (disponible con permiso, sin importar archivo) */}
        {onVerFinanzas && (
          (() => {
            const allowed = hasPerm(permVerFinanzas);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onVerFinanzas)}>
                    <ListItemIcon>
                      <PaidIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Ver finanzas" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {(
          (
            (!hideFinalize && !isArchived && onFinalize) ||
            (!hideTemporadas && !isArchived && onTemporadas) ||
            (!isArchived && onCosechas) ||
            onVerFinanzas
          ) && (
            (!isArchived && onReporteCosecha) ||
            (!isArchived && onReporteTemporada) ||
            (!isArchived && onReporteHuerta)
          )
        ) && (
          <Divider component="li" sx={{ my: 0.5 }} />
        )}

        {/* ====== REPORTES ====== */}
        {/* Reporte de Cosecha */}
        {!isArchived && onReporteCosecha && (
          (() => {
            const allowed = hasPerm(permReporteCosecha);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onReporteCosecha)}>
                    <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Reporte de Cosecha" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Reporte de Temporada */}
        {!isArchived && onReporteTemporada && (
          (() => {
            const allowed = hasPerm(permReporteTemporada);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onReporteTemporada)}>
                    <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Reporte de Temporada" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Reporte de Huerta (perfil) */}
        {!isArchived && onReporteHuerta && (
          (() => {
            const allowed = hasPerm(permReporteHuerta);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onReporteHuerta)}>
                    <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Reporte de Huerta" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {(
          (
            (!hideFinalize && !isArchived && onFinalize) ||
            (!hideTemporadas && !isArchived && onTemporadas) ||
            (!isArchived && onCosechas) ||
            onVerFinanzas ||
            (!isArchived && (onReporteCosecha || onReporteTemporada || onReporteHuerta))
          ) && (
            (!hideEdit && !isArchived && onEdit) ||
            (!hideArchiveToggle && onArchiveOrRestore) ||
            (!hideDelete && isArchived && onDelete)
          )
        ) && (
          <Divider component="li" sx={{ my: 0.5 }} />
        )}

        {/* Editar */}
        {!hideEdit && !isArchived && onEdit && (
          (() => {
            const allowed = hasPerm(permEdit);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onEdit)}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Editar" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Archivar / Restaurar */}
        {!hideArchiveToggle && onArchiveOrRestore && (
          (() => {
            const allowed = hasPerm(permArchiveOrRestore);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onArchiveOrRestore)}>
                    <ListItemIcon>
                      {isArchived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText primary={isArchived ? 'Restaurar' : 'Archivar'} />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}

        {/* Eliminar (solo cuando está archivado) */}
        {!hideDelete && isArchived && onDelete && (
          (() => {
            const allowed = hasPerm(permDelete);
            return (
              <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
                <span style={{ display: 'block' }}>
                  <MenuItem disabled={!allowed} onClick={() => handle(onDelete)}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Eliminar" />
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })()
        )}
      </Menu>
    </>
  );
};

export default ActionsMenu;
