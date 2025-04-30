// src/modules/gestion_huerta/components/propietario/PropietarioActionsMenu.tsx
import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface Props {
  isArchived: boolean;
  onArchiveOrRestore: () => void;
  onDelete: () => void;
}

const PropietarioActionsMenu: React.FC<Props> = ({
  isArchived,
  onArchiveOrRestore,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const openMenu = (evt: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(evt.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Más acciones">
        <IconButton size="small" onClick={openMenu}>
          <MoreVertIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            onArchiveOrRestore();
          }}
        >
          {isArchived ? 'Restaurar' : 'Archivar'}
        </MenuItem>

        {isArchived && (
          <MenuItem
            onClick={() => {
              closeMenu();
              onDelete();
            }}
          >
            Eliminar
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default PropietarioActionsMenu;
