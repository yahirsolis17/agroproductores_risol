import React from 'react';

interface WeekSwitcherProps {
  isoWeek: string;
  onPrev: () => void;
  onNext: () => void;
}

const WeekSwitcher: React.FC<WeekSwitcherProps> = ({ isoWeek }) => {
  return <div>Week: {isoWeek}</div>;
};

export default WeekSwitcher;

