import React from 'react';
import { TemplateInfo } from '../types';

interface TemplateCardProps {
  template: TemplateInfo;
  onClick: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onClick }) => {
  const duration = (template.durationInFrames / template.fps).toFixed(1);

  return (
    <div className="template-card" onClick={onClick}>
      <div className="template-card-header">
        <h3>{template.name}</h3>
        <span className="template-card-category">{template.category}</span>
      </div>
      <p>{template.description}</p>
      <div className="template-card-tags">
        {template.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="template-card-meta">
        <span>⏱ {duration}s</span>
        <span>🎞 {template.fps}fps</span>
        <span>📐 {template.supportedFormats.length} formats</span>
      </div>
    </div>
  );
};
