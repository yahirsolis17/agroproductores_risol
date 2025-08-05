// src/modules/gestion_huerta/components/common/ActionsMenu.tsx

import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
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

interface ActionsMenuProps {
  isArchived: boolean;
  isFinalized?: boolean;                       // Nuevo flag para estado “finalizada”
  onEdit?: () => void;
  onFinalize?: () => void;                     // Nuevo callback para “Finalizar” o “Reactivar”
  onArchiveOrRestore?: () => void;
  onDelete?: () => void;
  onTemporadas?: () => void;
  hideEdit?: boolean;
  hideDelete?: boolean;
  hideArchiveToggle?: boolean;
  hideFinalize?: boolean;                      // Oculta “Finalizar/Reactivar” si no queremos mostrarlo
  hideTemporadas?: boolean;
  labelFinalize?: string;                      // Texto personalizado para “Finalizar” o “Reactivar”
  labelTemporadas?: string;
  permEdit?: string;
  permFinalize?: string;
  permArchiveOrRestore?: string;
  permDelete?: string;
  permTemporadas?: string;
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
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const handle = (fn?: () => void) => {
    closeMenu();
    fn && fn();
  };

  // Permisos: replicar la lógica de PermissionButton
  const roleRedux  = useSelector(
    (s: RootState) => s.auth.user?.role,
    shallowEqual
  );
  const permsRedux = useSelector(
    (s: RootState) => s.auth.permissions,
    shallowEqual
  );
  const { user: ctxUser, permissions: ctxPerms } = useAuth();
  const role = roleRedux ?? ctxUser?.role;
  const raw  = permsRedux.length ? permsRedux : ctxPerms;
  const normalized = raw.map(p => p.includes('.') ? p.split('.').pop()! : p);
  const hasPerm = (perm?: string) => !perm || role === 'admin' || normalized.includes(perm);

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

        {/* 
          1) BOTÓN “FINALIZAR” si no está finalizada, o “REACTIVAR” si ya está finalizada 
          - Solo se muestra si no está archivada (isArchived===false) y hideFinalize===false 
        */}
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

        {/* Consultar / Temporadas */}
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

        {/* Eliminar */}
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
