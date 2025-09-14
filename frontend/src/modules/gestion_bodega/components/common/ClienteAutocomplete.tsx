import React from 'react';

interface Props {
  value?: number | null;
  onChange?: (id: number | null) => void;
}

const ClienteAutocomplete: React.FC<Props> = () => {
  return <div>ClienteAutocomplete</div>;
};

export default ClienteAutocomplete;

