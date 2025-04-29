import React, { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface UserActionsMenuProps {
  onDeactivate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onManagePermissions: () => void;
}

const UserActionsMenu: React.FC<UserActionsMenuProps> = ({
  onDeactivate,
  onArchive,
  onDelete,
  onManagePermissions
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
      <IconButton onClick={handleOpen} size="small">
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { handleClose(); onDeactivate(); }}>
          Desactivar / Activar
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); onArchive(); }}>
          Archivar
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); onDelete(); }}>
          Eliminar
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); onManagePermissions(); }}>
          Gestionar permisos
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserActionsMenu;
