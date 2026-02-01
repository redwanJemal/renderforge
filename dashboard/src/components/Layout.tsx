import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'gallery' | 'configurator';
  onNavigate: (view: 'gallery') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="icon">🎬</span>
            <span className="gradient-text">RenderForge</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Navigation</div>
          <button
            className={`nav-item ${currentView === 'gallery' ? 'active' : ''}`}
            onClick={() => onNavigate('gallery')}
          >
            <span>🎨</span>
            Templates
          </button>
          <button className="nav-item" style={{ opacity: 0.5, cursor: 'default' }}>
            <span>📦</span>
            Render Queue
          </button>
          <button className="nav-item" style={{ opacity: 0.5, cursor: 'default' }}>
            <span>⚙️</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          RenderForge v0.1.0
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
