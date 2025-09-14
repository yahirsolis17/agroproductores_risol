import React from 'react';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  onAccept?: () => void;
  onClose?: () => void;
}

const ConfirmDialog: React.FC<Props> = ({ open }) => {
  if (!open) return null;
  return <div>ConfirmDialog</div>;
};

export default ConfirmDialog;

