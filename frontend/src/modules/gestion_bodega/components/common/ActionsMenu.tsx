// src/modules/gestion_bodega/components/common/ActionsMenu.tsx
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';

type Perm = string | string[] | undefined;

export interface ActionsMenuProps {
  isArchived: boolean;

  // base
  onEdit?: () => void;
  onArchiveOrRestore?: () => void;
  onDelete?: () => void;
  onView?: () => void;

  hideEdit?: boolean;
  hideDelete?: boolean;
  hideArchiveToggle?: boolean;
  hideView?: boolean;

  permEdit?: Perm;               // default: 'change_bodega'
  permArchiveOrRestore?: Perm;   // default: isArchived ? 'restore_bodega' : 'archive_bodega'
  permDelete?: Perm;             // default: 'delete_bodega'
  permView?: Perm;               // default: 'view_bodega'

  // extras para Temporadas
  isFinalized?: boolean;         // muestra acción Finalizar/Reactivar
  onFinalize?: () => void;
  hideFinalize?: boolean;
  labelFinalize?: string;        // si no viene, infiere 'Finalizar'/'Reactivar'
  permFinalize?: Perm;           // default: isFinalized ? 'reactivate_temporadabodega' : 'finalize_temporadabodega'

  onTemporadas?: () => void;     // acción "Temporadas" adicional
  labelTemporadas?: string;      // default: 'Temporadas'
  permTemporadas?: Perm;         // NUEVO: permisos para "Temporadas" (default: 'view_temporadabodega')
}

const ActionsMenu: React.FC<ActionsMenuProps> = (props) => {
  const {
    isArchived,
    onEdit,
    onArchiveOrRestore,
    onDelete,
    onView,

    hideEdit = false,
    hideDelete = false,
    hideArchiveToggle = false,
    hideView = false,

    permEdit,
    permArchiveOrRestore,
    permDelete,
    permView,

    // extras
    isFinalized,
    onFinalize,
    hideFinalize = false,
    labelFinalize,
    permFinalize,

    onTemporadas,
    labelTemporadas = 'Temporadas',
    permTemporadas, // NUEVO
  } = props;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const handle = (fn?: () => void) => { closeMenu(); fn && fn(); };

  // Permisos: normaliza 'app_label.codename' -> 'codename' y bypass admin
  const roleRedux  = useSelector((s: RootState) => s.auth.user?.role, shallowEqual);
  const permsRedux = useSelector((s: RootState) => s.auth.permissions as string[] | undefined, shallowEqual);
  const { user: ctxUser, permissions: ctxPerms } = useAuth();

  const role = roleRedux ?? ctxUser?.role ?? undefined;
  const raw  = (permsRedux && permsRedux.length ? permsRedux : (ctxPerms ?? [])) as string[];
  const normalized = raw
    .map(p => (p && p.includes('.')) ? p.split('.').pop()! : p)
    .filter(Boolean) as string[];

  const hasPerm = (perm: Perm) => {
    if (role === 'admin') return true;
    if (!perm) return false;
    const check = (p: string) => normalized.includes(p);
    return Array.isArray(perm) ? perm.some(check) : check(perm);
  };

  // Defaults por acción
  const _permEdit   = permEdit ?? 'change_bodega';
  const _permAorR   = permArchiveOrRestore ?? (isArchived ? 'restore_bodega' : 'archive_bodega');
  const _permDelete = permDelete ?? 'delete_bodega';
  const _permView   = permView ?? 'view_bodega';

  const _permFinalize    = permFinalize ?? (isFinalized ? 'reactivate_temporadabodega' : 'finalize_temporadabodega');
  const _labelFinalize   = labelFinalize ?? (isFinalized ? 'Reactivar' : 'Finalizar');

  const _permTemporadas  = permTemporadas ?? 'view_temporadabodega'; // NUEVO default

  const canEdit       = hasPerm(_permEdit);
  const canAorR       = hasPerm(_permAorR);
  const canDelete     = hasPerm(_permDelete);
  const canView       = hasPerm(_permView);
  const canFinalize   = hasPerm(_permFinalize);
  const canTemporadas = onTemporadas ? hasPerm(_permTemporadas) : false; // NUEVO

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
        {/* Ver */}
        {!hideView && onView && (
          <Tooltip title={canView ? '' : 'No tienes permiso'} disableHoverListener={canView}>
            <span style={{ display: 'block' }}>
              <MenuItem disabled={!canView} onClick={() => handle(onView)}>
                <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Temporadas" />
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {/* Temporadas (con permiso propio) */}
        {onTemporadas && (
          <Tooltip title={canTemporadas ? '' : 'No tienes permiso'} disableHoverListener={canTemporadas}>
            <span style={{ display: 'block' }}>
              <MenuItem disabled={!canTemporadas} onClick={() => handle(onTemporadas)}>
                <ListItemIcon><EventNoteIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={labelTemporadas} />
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {(onView || onTemporadas) && (onEdit || onArchiveOrRestore || onFinalize || onDelete) && (
          <Divider component="li" sx={{ my: 0.5 }} />
        )}

        {/* Editar (oculto si archivado) */}
        {!hideEdit && !isArchived && onEdit && (
          <Tooltip title={canEdit ? '' : 'No tienes permiso'} disableHoverListener={canEdit}>
            <span style={{ display: 'block' }}>
              <MenuItem disabled={!canEdit} onClick={() => handle(onEdit)}>
                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Editar" />
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {/* Archivar / Restaurar */}
        {!hideArchiveToggle && onArchiveOrRestore && (
          <Tooltip title={canAorR ? '' : 'No tienes permiso'} disableHoverListener={canAorR}>
            <span style={{ display: 'block' }}>
              <MenuItem disabled={!canAorR} onClick={() => handle(onArchiveOrRestore)}>
                <ListItemIcon>
                  {isArchived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary={isArchived ? 'Restaurar' : 'Archivar'} />
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {/* Finalizar / Reactivar (cuando aplique) */}
        {!hideFinalize && onFinalize && (
          <Tooltip title={canFinalize ? '' : 'No tienes permiso'} disableHoverListener={canFinalize}>
            <span style={{ display: 'block' }}>
              <MenuItem disabled={!canFinalize || !!isArchived} onClick={() => handle(onFinalize)}>
                <ListItemIcon>
                  {isFinalized ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary={_labelFinalize} />
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {/* Eliminar (solo si está archivado) */}
        {!hideDelete && isArchived && onDelete && (
          <Tooltip title={canDelete ? '' : 'No tienes permiso'} disableHoverListener={canDelete}>
            <span style={{ display: 'block' }}>
              <MenuItem disabled={!canDelete} onClick={() => handle(onDelete)}>
                <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Eliminar" />
              </MenuItem>
            </span>
          </Tooltip>
        )}
      </Menu>
    </>
  );
};

export default ActionsMenu;
