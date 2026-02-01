import React from 'react';
import { TemplateInfo } from '../types';
import { TemplateCard } from './TemplateCard';

interface TemplateGalleryProps {
  templates: TemplateInfo[];
  onSelect: (template: TemplateInfo) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ templates, onSelect }) => {
  return (
    <>
      <div className="page-header">
        <h1>🎨 Template Gallery</h1>
        <p>Choose a template to start creating your video</p>
      </div>
      <div className="gallery-grid">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => onSelect(template)}
          />
        ))}
      </div>
    </>
  );
};
