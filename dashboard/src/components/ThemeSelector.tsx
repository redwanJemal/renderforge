import React from 'react';
import { Theme } from '../types';

interface ThemeSelectorProps {
  themes: Theme[];
  selected: string;
  onSelect: (themeId: string) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, selected, onSelect }) => {
  return (
    <div className="bottom-bar-section">
      <label>Theme</label>
      <div className="theme-pills">
        {themes.map((theme) => (
          <button
            key={theme.id}
            className={`theme-pill ${selected === theme.id ? 'active' : ''}`}
            onClick={() => onSelect(theme.id)}
            title={theme.name}
          >
            <span
              className="theme-color-dot"
              style={{ background: theme.colors.primary }}
            />
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};
