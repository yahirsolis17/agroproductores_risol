// src/modules/gestion_usuarios/components/UserActionsMenu.tsx
import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

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
          {isArchived ? 'Restaurar' : 'Archivar'}
        </MenuItem>

        {isArchived && (
          <MenuItem
            onClick={() => {
              handleClose();
              onDelete();
            }}
          >
            Eliminar
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            handleClose();
            onManagePermissions();
          }}
        >
          Gestionar permisos
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserActionsMenu;
