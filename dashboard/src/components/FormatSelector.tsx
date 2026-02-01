import React from 'react';
import { Format, FORMATS } from '../types';

interface FormatSelectorProps {
  formats: Format[];
  selected: Format;
  onSelect: (format: Format) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({ formats, selected, onSelect }) => {
  return (
    <div className="bottom-bar-section">
      <label>Format</label>
      <div className="format-options">
        {formats.map((f) => (
          <button
            key={f}
            className={`format-option ${selected === f ? 'active' : ''}`}
            onClick={() => onSelect(f)}
            title={FORMATS[f].label}
          >
            <span className={`format-icon ${f}`} />
            {FORMATS[f].label}
          </button>
        ))}
      </div>
    </div>
  );
};
