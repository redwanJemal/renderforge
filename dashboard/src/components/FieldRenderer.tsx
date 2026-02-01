import React, { useState, useCallback } from 'react';
import { SchemaField } from '../types';

interface FieldRendererProps {
  field: SchemaField;
  value: any;
  onChange: (value: any) => void;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'boolean':
      return <BooleanField field={field} value={value} onChange={onChange} />;
    case 'color':
      return <ColorField field={field} value={value} onChange={onChange} />;
    case 'number':
      return <NumberField field={field} value={value} onChange={onChange} />;
    case 'array':
      if (field.items?.type === 'object' && field.items?.fields) {
        return <ObjectArrayField field={field} value={value} onChange={onChange} />;
      }
      return <TagsField field={field} value={value} onChange={onChange} />;
    case 'object':
      return <ObjectField field={field} value={value} onChange={onChange} />;
    default:
      if (field.options && field.options.length > 0) {
        return <EnumField field={field} value={value} onChange={onChange} />;
      }
      return <StringField field={field} value={value} onChange={onChange} />;
  }
};

// String input
const StringField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => {
  const isLong = typeof value === 'string' && value.length > 60;
  return (
    <div className="form-group">
      <label>{field.label}</label>
      {isLong ? (
        <textarea
          className="form-control"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description}
          rows={3}
        />
      ) : (
        <input
          type="text"
          className="form-control"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description}
        />
      )}
    </div>
  );
};

// Boolean toggle
const BooleanField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => (
  <div className="form-group">
    <div className="toggle-wrapper">
      <label>{field.label}</label>
      <div
        className={`toggle ${value ? 'active' : ''}`}
        onClick={() => onChange(!value)}
      />
    </div>
  </div>
);

// Color picker
const ColorField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => (
  <div className="form-group">
    <label>{field.label}</label>
    <div className="color-input-wrapper">
      <div className="color-swatch">
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <input
        type="text"
        className="form-control"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
      />
    </div>
  </div>
);

// Number input with slider
const NumberField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  return (
    <div className="form-group">
      <label>{field.label}</label>
      <div className="number-input-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={numVal % 1 !== 0 ? 0.1 : 1}
          value={numVal}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <input
          type="number"
          className="form-control"
          min={min}
          max={max}
          value={numVal}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

// Enum dropdown
const EnumField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => (
  <div className="form-group">
    <label>{field.label}</label>
    <select
      className="form-control"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {field.options!.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

// Tags input (array of strings)
const TagsField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => {
  const [inputVal, setInputVal] = useState('');
  const items: string[] = Array.isArray(value) ? value : [];

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      e.preventDefault();
      onChange([...items, inputVal.trim()]);
      setInputVal('');
    } else if (e.key === 'Backspace' && !inputVal && items.length > 0) {
      onChange(items.slice(0, -1));
    }
  }, [inputVal, items, onChange]);

  const removeTag = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  return (
    <div className="form-group">
      <label>{field.label}</label>
      <div className="tags-input">
        {items.map((item, i) => (
          <span key={i} className="tag-item">
            {item}
            <span className="tag-remove" onClick={() => removeTag(i)}>×</span>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={items.length === 0 ? 'Type and press Enter…' : ''}
        />
      </div>
    </div>
  );
};

// Object field (nested fields)
const ObjectField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => {
  const objVal = value && typeof value === 'object' ? value : {};
  return (
    <div className="form-group">
      <label>{field.label}</label>
      <div className="nested-fields">
        {field.fields?.map((subField) => (
          <FieldRenderer
            key={subField.name}
            field={subField}
            value={objVal[subField.name] ?? subField.default}
            onChange={(v) => onChange({ ...objVal, [subField.name]: v })}
          />
        ))}
      </div>
    </div>
  );
};

// Array of objects
const ObjectArrayField: React.FC<FieldRendererProps> = ({ field, value, onChange }) => {
  const items: any[] = Array.isArray(value) ? value : [];

  const addItem = () => {
    const defaults: Record<string, any> = {};
    field.items?.fields?.forEach((f) => { defaults[f.name] = f.default; });
    onChange([...items, defaults]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updated: any) => {
    const newItems = [...items];
    newItems[index] = updated;
    onChange(newItems);
  };

  return (
    <div className="form-group">
      <label>{field.label}</label>
      {items.map((item, i) => (
        <div key={i} className="array-item">
          <div className="nested-fields">
            {field.items?.fields?.map((subField) => (
              <FieldRenderer
                key={subField.name}
                field={subField}
                value={item[subField.name] ?? subField.default}
                onChange={(v) => updateItem(i, { ...item, [subField.name]: v })}
              />
            ))}
          </div>
          <button className="array-item-remove" onClick={() => removeItem(i)} title="Remove">
            ✕
          </button>
        </div>
      ))}
      <button className="array-add-btn" onClick={addItem}>+ Add Item</button>
    </div>
  );
};
