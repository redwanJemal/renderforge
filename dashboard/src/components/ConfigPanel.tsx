import React from 'react';
import { TemplateInfo, SchemaField } from '../types';
import { FieldRenderer } from './FieldRenderer';

interface ConfigPanelProps {
  template: TemplateInfo;
  props: Record<string, any>;
  onPropsChange: (props: Record<string, any>) => void;
  onBack: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  template,
  props,
  onPropsChange,
  onBack,
}) => {
  const handleFieldChange = (fieldName: string, value: any) => {
    onPropsChange({ ...props, [fieldName]: value });
  };

  const fields: SchemaField[] = template.schema || [];

  return (
    <div className="config-left">
      <div className="config-left-header">
        <button className="back-btn" onClick={onBack} title="Back to Gallery">
          ←
        </button>
        <div>
          <h2>{template.name}</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {template.category}
          </span>
        </div>
      </div>

      <div className="config-form">
        <div className="form-section">
          <div className="form-section-title">Template Properties</div>
          {fields.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No configurable properties
            </p>
          ) : (
            fields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={props[field.name] ?? field.default}
                onChange={(v) => handleFieldChange(field.name, v)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
