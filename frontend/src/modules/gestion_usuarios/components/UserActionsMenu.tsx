// src/modules/gestion_usuarios/components/UserActionsMenu.tsx
import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

export interface UserActionsMenuProps {
  isArchived: boolean;
  onArchiveOrRestore: () => void;
  onDelete: () => void;
  onManagePermissions: () => void;
}

const UserActionsMenu: React.FC<UserActionsMenuProps> = ({
  isArchived,
  onArchiveOrRestore,
  onDelete,
  onManagePermissions,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Más acciones">
        <IconButton size="small" onClick={handleOpen}>
          <MoreVertIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            onArchiveOrRestore();
          }}
        >
          <ListItemIcon>
            {isArchived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {isArchived ? 'Restaurar' : 'Archivar'}
          </ListItemText>
        </MenuItem>

        {isArchived && (
          <MenuItem
            onClick={() => {
              handleClose();
              onDelete();
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>
              Eliminar
            </ListItemText>
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            handleClose();
            onManagePermissions();
          }}
        >
          <ListItemIcon>
            <AdminPanelSettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Gestionar permisos
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserActionsMenu;
