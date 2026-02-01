import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getPreviewUrl } from '../api';
import { TemplateInfo, Format, FORMATS } from '../types';

interface PreviewPanelProps {
  template: TemplateInfo;
  props: Record<string, any>;
  format: Format;
  theme: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  template,
  props,
  format,
  theme,
}) => {
  const [frame, setFrame] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const maxFrames = template.durationInFrames - 1;
  const formatConfig = FORMATS[format];
  const aspectRatio = formatConfig.width / formatConfig.height;

  // Compute display size that fits the panel
  const maxW = 480;
  const maxH = 600;
  let displayW: number, displayH: number;
  if (aspectRatio > maxW / maxH) {
    displayW = maxW;
    displayH = maxW / aspectRatio;
  } else {
    displayH = maxH;
    displayW = maxH * aspectRatio;
  }

  const loadPreview = useCallback(() => {
    const url = getPreviewUrl({ template: template.id, format, theme, props, frame });
    setLoading(true);
    setError(null);

    const img = new Image();
    img.onload = () => {
      setImgSrc(url);
      setLoading(false);
    };
    img.onerror = () => {
      setError('Preview generation failed');
      setLoading(false);
    };
    img.src = url;
  }, [template.id, format, theme, props, frame]);

  // Debounced preview loading
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadPreview, 500);
    return () => clearTimeout(debounceRef.current);
  }, [loadPreview]);

  return (
    <div className="preview-panel">
      <div
        className="preview-container"
        style={{ width: displayW, height: displayH }}
      >
        {imgSrc && !error && (
          <img
            src={imgSrc}
            alt={`${template.name} preview`}
            style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}
          />
        )}
        {loading && (
          <div className="preview-loading">
            <div className="loading-spinner" />
            <span style={{ fontSize: 13 }}>Generating preview…</span>
          </div>
        )}
        {!imgSrc && !loading && !error && (
          <div className="preview-placeholder" style={{ width: displayW, height: displayH }}>
            <span className="icon">🖼️</span>
            <span>Loading preview…</span>
          </div>
        )}
        {error && (
          <div className="preview-placeholder" style={{ width: displayW, height: displayH }}>
            <span className="icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="preview-frame-controls">
        <span>Frame</span>
        <input
          type="range"
          min={0}
          max={maxFrames}
          value={frame}
          onChange={(e) => setFrame(parseInt(e.target.value))}
        />
        <span>{frame} / {maxFrames}</span>
      </div>
    </div>
  );
};
