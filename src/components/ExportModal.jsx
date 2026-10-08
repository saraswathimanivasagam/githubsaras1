import React, { useState } from 'react';
import { DownloadIcon, CloseIcon, CheckCircleIcon, SparklesIcon } from './Icons';
import { formatTime } from '../utils/formatTime';

export default function ExportModal({
  isOpen,
  onClose,
  trimStart,
  trimEnd,
  aspectRatio,
  activeFilterName,
  isExporting,
  exportProgress,
  exportedBlob,
  onStartExport,
  captionsCount = 0,
  captionsEnabled = false,
}) {
  const [resolution, setResolution] = useState('1080p');
  const [includeCaptions, setIncludeCaptions] = useState(captionsEnabled && captionsCount > 0);

  if (!isOpen) return null;

  const duration = Math.max(0.1, trimEnd - trimStart);

  const handleDownload = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClipAI_Export_${aspectRatio.replace(':', '-')}_${Math.round(duration)}s.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="modal-backdrop" onClick={!isExporting ? onClose : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <SparklesIcon className="modal-title-icon" />
            <h3>Export Trimmed Video</h3>
          </div>
          {!isExporting && (
            <button type="button" className="close-btn" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </div>

        <div className="modal-body">
          {/* Summary Card */}
          <div className="export-summary-card">
            <div className="summary-item">
              <span className="summary-label">Trim Duration</span>
              <span className="summary-value highlight">{formatTime(duration, true)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Format</span>
              <span className="summary-value">{aspectRatio}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Color Preset</span>
              <span className="summary-value">{activeFilterName}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Subtitles</span>
              <span className="summary-value">
                {captionsCount > 0 && includeCaptions ? `${captionsCount} Cues (Burned in)` : 'None'}
              </span>
            </div>
          </div>

          {/* Export Settings (before starting) */}
          {!isExporting && !exportedBlob && (
            <div className="export-options">
              <label className="option-label">Resolution Quality</label>
              <div className="resolution-pills">
                <button
                  type="button"
                  className={`pill-btn ${resolution === '1080p' ? 'active' : ''}`}
                  onClick={() => setResolution('1080p')}
                >
                  1080p (Full HD)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${resolution === '720p' ? 'active' : ''}`}
                  onClick={() => setResolution('720p')}
                >
                  720p (Fast)
                </button>
              </div>

              {/* Burn in Subtitles Option */}
              {captionsCount > 0 && (
                <div className="burn-subtitles-row">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={includeCaptions}
                      onChange={(e) => setIncludeCaptions(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      Burn in AI subtitles ({captionsCount} active cues)
                    </span>
                  </label>
                </div>
              )}

              <p className="export-hint">
                Video is encoded smoothly directly inside your browser. No files are uploaded to any server.
              </p>
            </div>
          )}

          {/* Progress State */}
          {isExporting && (
            <div className="export-progress-container">
              <div className="progress-info">
                <span className="progress-status-text">
                  {exportProgress < 99 ? 'Encoding trimmed frames...' : 'Finalizing video file...'}
                </span>
                <span className="progress-percent">{exportProgress}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p className="progress-subtext">Please keep this browser tab open while rendering.</p>
            </div>
          )}

          {/* Completed State */}
          {exportedBlob && !isExporting && (
            <div className="export-success-box">
              <CheckCircleIcon className="success-icon" />
              <h4>Render Complete!</h4>
              <p>Your trimmed video is ready for download.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!isExporting && !exportedBlob && (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onStartExport(resolution, includeCaptions)}
              >
                <DownloadIcon className="btn-icon" />
                <span>Start Export</span>
              </button>
            </>
          )}

          {exportedBlob && !isExporting && (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Done
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                <DownloadIcon className="btn-icon" />
                <span>Download Video (.webm)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
