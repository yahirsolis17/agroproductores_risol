import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import EventNoteIcon from '@mui/icons-material/EventNote';

interface ActionsMenuProps {
  isArchived: boolean;
  onEdit?: () => void;
  onArchiveOrRestore?: () => void;
  onDelete?: () => void;
  onTemporadas?: () => void;        // Acción configurable
  hideEdit?: boolean;
  hideDelete?: boolean;
  hideArchiveToggle?: boolean;
  hideTemporadas?: boolean;
  labelTemporadas?: string;         // ← Nuevo prop para renombrar
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  isArchived,
  onEdit,
  onArchiveOrRestore,
  onDelete,
  onTemporadas,
  hideEdit = false,
  hideDelete = false,
  hideArchiveToggle = false,
  hideTemporadas = false,
  labelTemporadas,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const handle = (fn?: () => void) => {
    closeMenu();
    fn && fn();
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
        {/* Consultar / Temporalidades */}
        {!hideTemporadas && !isArchived && onTemporadas && (
          <MenuItem onClick={() => handle(onTemporadas)}>
            <ListItemIcon>
              <EventNoteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={labelTemporadas ?? 'Temporadas'} />
          </MenuItem>
        )}

        {/* Editar */}
        {!hideEdit && !isArchived && onEdit && (
          <MenuItem onClick={() => handle(onEdit)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Editar" />
          </MenuItem>
        )}

        {/* Archivar / Restaurar */}
        {!hideArchiveToggle && onArchiveOrRestore && (
          <MenuItem onClick={() => handle(onArchiveOrRestore)}>
            <ListItemIcon>
              {isArchived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={isArchived ? 'Restaurar' : 'Archivar'} />
          </MenuItem>
        )}

        {/* Eliminar */}
        {!hideDelete && isArchived && onDelete && (
          <MenuItem onClick={() => handle(onDelete)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Eliminar" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default ActionsMenu;
