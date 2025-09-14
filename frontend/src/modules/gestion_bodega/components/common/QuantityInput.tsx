import React from 'react';

interface Props {
  value?: number;
  onChange?: (v: number) => void;
  min?: number;
}

const QuantityInput: React.FC<Props> = ({ value }) => {
  return <div>Quantity: {value ?? 0}</div>;
};

export default QuantityInput;

