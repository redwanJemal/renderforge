import React from 'react';
import { RenderJob } from '../types';

interface RenderButtonProps {
  onRender: () => void;
  job: RenderJob | null;
  submitting: boolean;
  error: string | null;
  downloadUrl: string | null;
  onReset: () => void;
}

export const RenderButton: React.FC<RenderButtonProps> = ({
  onRender,
  job,
  submitting,
  error,
  downloadUrl,
  onReset,
}) => {
  const isRendering = job?.status === 'queued' || job?.status === 'rendering';
  const isComplete = job?.status === 'complete';
  const isFailed = job?.status === 'failed';

  return (
    <>
      <button
        className="render-btn"
        onClick={onRender}
        disabled={submitting || isRendering}
      >
        {submitting || isRendering ? (
          <>
            <span className="spinner" />
            {isRendering ? `Rendering ${job?.progress || 0}%` : 'Submitting…'}
          </>
        ) : (
          <>🎬 Render Video</>
        )}
      </button>

      {(isComplete || isFailed) && (
        <div className="render-overlay" onClick={onReset}>
          <div className="render-modal" onClick={(e) => e.stopPropagation()}>
            {isComplete ? (
              <>
                <h3>✅ Render Complete!</h3>
                <p>Your video is ready to download.</p>
                {job && (
                  <div className="progress-bar-wrapper" style={{ marginBottom: 20 }}>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: '100%' }} />
                    </div>
                    <div className="progress-text">
                      Completed in {((job.completedAt! - job.createdAt) / 1000).toFixed(1)}s
                    </div>
                  </div>
                )}
                <a className="download-btn" href={downloadUrl!} download>
                  ⬇ Download Video
                </a>
                <button className="close-btn" onClick={onReset}>Close</button>
              </>
            ) : (
              <>
                <h3>❌ Render Failed</h3>
                <p style={{ color: 'var(--error)' }}>{error || 'Unknown error'}</p>
                <button className="close-btn" onClick={onReset}>Close</button>
              </>
            )}
          </div>
        </div>
      )}

      {isRendering && job && (
        <div className="progress-bar-wrapper" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
          <div className="progress-bar" style={{ borderRadius: 0, height: 3 }}>
            <div className="progress-bar-fill" style={{ width: `${job.progress}%`, borderRadius: 0 }} />
          </div>
        </div>
      )}
    </>
  );
};
