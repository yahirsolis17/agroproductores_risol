// src/modules/gestion_huerta/components/huerta/HuertaActionsMenu.tsx
import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface Props {
  isArchived: boolean;
  onEdit: () => void;
  onArchiveOrRestore: () => void;
  onDelete: () => void;
}

const HuertaActionsMenu: React.FC<Props> = ({
  isArchived,
  onEdit,
  onArchiveOrRestore,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const openMenu  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const handle    = (fn: () => void) => { closeMenu(); fn(); };

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
        <MenuItem onClick={() => handle(onEdit)}>Editar</MenuItem>

        <MenuItem onClick={() => handle(onArchiveOrRestore)}>
          {isArchived ? 'Restaurar' : 'Archivar'}
        </MenuItem>

        {isArchived && (
          <MenuItem onClick={() => handle(onDelete)}>Eliminar</MenuItem>
        )}
      </Menu>
    </>
  );
};

export default HuertaActionsMenu;
