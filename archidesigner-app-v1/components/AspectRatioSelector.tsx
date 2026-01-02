
import React from 'react';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  onSelectRatio: (ratio: string) => void;
}

const ratios = [
  { value: '1:1', label: '1:1' }, // Square
  { value: '4:5', label: '4:5' }, // Portrait
  { value: '9:16', label: '9:16' }, // Portrait
  { value: '16:9', label: '16:9' }, // Landscape
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onSelectRatio }) => {
  return (
    <div className="flex items-center bg-[#2C2C2E] rounded-lg p-0.5">
      {ratios.map(ratio => (
        <button
          key={ratio.value}
          onClick={() => onSelectRatio(ratio.value)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
            selectedRatio === ratio.value
              ? 'bg-gray-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {ratio.label}
        </button>
      ))}
    </div>
  );
};
