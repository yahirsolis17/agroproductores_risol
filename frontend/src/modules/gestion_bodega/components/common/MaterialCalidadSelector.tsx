import React from 'react';

interface Props {
  material?: string;
  calidad?: string;
  onChange?: (next: { material?: string; calidad?: string }) => void;
}

const MaterialCalidadSelector: React.FC<Props> = () => {
  return <div>MaterialCalidadSelector</div>;
};

export default MaterialCalidadSelector;

