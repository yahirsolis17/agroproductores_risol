// src/modules/gestion_usuarios/components/UserActionsMenu.tsx
import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface UserActionsMenuProps {
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Más acciones">
        <IconButton onClick={handleOpen} size="small">
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

        {/* Mostrar Eliminar solo si está archivado */}
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
