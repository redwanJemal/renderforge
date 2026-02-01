import React, { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { TemplateGallery } from './components/TemplateGallery';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ThemeSelector } from './components/ThemeSelector';
import { FormatSelector } from './components/FormatSelector';
import { RenderButton } from './components/RenderButton';
import { useTemplates } from './hooks/useTemplates';
import { useRender } from './hooks/useRender';
import { TemplateInfo, Format } from './types';

export const App: React.FC = () => {
  const { templates, themes, loading, error: loadError } = useTemplates();
  const { job, submitting, error: renderError, startRender, reset, downloadUrl } = useRender();

  const [view, setView] = useState<'gallery' | 'configurator'>('gallery');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);
  const [props, setProps] = useState<Record<string, any>>({});
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedFormat, setSelectedFormat] = useState<Format>('landscape');

  const handleSelectTemplate = useCallback((template: TemplateInfo) => {
    setSelectedTemplate(template);
    setProps({ ...template.defaultProps });
    setSelectedFormat(template.supportedFormats[0] || 'landscape');
    setView('configurator');
    reset();
  }, [reset]);

  const handleBack = useCallback(() => {
    setView('gallery');
    setSelectedTemplate(null);
    reset();
  }, [reset]);

  const handleRender = useCallback(() => {
    if (!selectedTemplate) return;
    startRender({
      templateId: selectedTemplate.id,
      props,
      theme: selectedTheme,
      format: selectedFormat,
      outputFormat: 'mp4',
    });
  }, [selectedTemplate, props, selectedTheme, selectedFormat, startRender]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--text-muted)' }}>Loading RenderForge…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="loading-screen">
        <div className="error-message">
          Failed to load: {loadError}
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={view} onNavigate={() => handleBack()}>
      {view === 'gallery' && (
        <TemplateGallery templates={templates} onSelect={handleSelectTemplate} />
      )}

      {view === 'configurator' && selectedTemplate && (
        <>
          <div className="configurator">
            <ConfigPanel
              template={selectedTemplate}
              props={props}
              onPropsChange={setProps}
              onBack={handleBack}
            />
            <PreviewPanel
              template={selectedTemplate}
              props={props}
              format={selectedFormat}
              theme={selectedTheme}
            />
          </div>

          <div className="bottom-bar">
            <ThemeSelector
              themes={themes}
              selected={selectedTheme}
              onSelect={setSelectedTheme}
            />
            <FormatSelector
              formats={selectedTemplate.supportedFormats}
              selected={selectedFormat}
              onSelect={setSelectedFormat}
            />
            <div className="bottom-bar-spacer" />
            <RenderButton
              onRender={handleRender}
              job={job}
              submitting={submitting}
              error={renderError}
              downloadUrl={downloadUrl}
              onReset={reset}
            />
          </div>
        </>
      )}
    </Layout>
  );
};
