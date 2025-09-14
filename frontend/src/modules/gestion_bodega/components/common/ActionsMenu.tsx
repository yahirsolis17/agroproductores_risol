// modules/gestion_bodega/components/common/ActionsMenu.tsx
import React from 'react';

interface ActionsMenuProps {
  onEdit?: () => void;
  onArchiveOrRestore?: () => void;
  onDelete?: () => void;
}

const ActionsMenu: React.FC<ActionsMenuProps> = () => {
  return <div>ActionsMenu</div>;
};

export default ActionsMenu;

