import React from 'react';

interface IsoWeekPickerProps {
  value?: string;
  onChange?: (v: string) => void;
}

const IsoWeekPicker: React.FC<IsoWeekPickerProps> = ({ value }) => {
  return <div>IsoWeekPicker {value}</div>;
};

export default IsoWeekPicker;

