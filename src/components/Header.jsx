import React from 'react';
import { DownloadIcon, SparklesIcon, UploadIcon } from './Icons';

export default function Header({
  videoName,
  aspectRatio,
  onAspectRatioChange,
  onNewVideo,
  onOpenExport,
  onOpenTextToVideo,
  onOpenFalTextToVideo,
  hasVideo,
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-badge">
          <SparklesIcon className="logo-icon" />
          <span className="logo-title">Clip<span className="accent-text">AI</span> Studio</span>
        </div>
        {videoName && (
          <div className="video-title-pill" title={videoName}>
            <span className="status-dot"></span>
            <span className="video-title-text">{videoName}</span>
          </div>
        )}
      </div>

      <div className="header-center">
        {hasVideo && (
          <div className="aspect-ratio-selector">
            <span className="selector-label">Format:</span>
            <button
              type="button"
              className={`ratio-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
              onClick={() => onAspectRatioChange('16:9')}
              title="16:9 Landscape (YouTube / Desktop)"
            >
              16:9
            </button>
            <button
              type="button"
              className={`ratio-btn ${aspectRatio === '9:16' ? 'active' : ''}`}
              onClick={() => onAspectRatioChange('9:16')}
              title="9:16 Vertical (TikTok / Shorts / Reels)"
            >
              9:16
            </button>
            <button
              type="button"
              className={`ratio-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
              onClick={() => onAspectRatioChange('1:1')}
              title="1:1 Square (Instagram)"
            >
              1:1
            </button>
          </div>
        )}
      </div>

      <div className="header-right">
        <button
          type="button"
          className="btn btn-secondary header-create-text-btn"
          onClick={onOpenTextToVideo}
          title="Create with Text (AI Video Generator)"
        >
          <SparklesIcon className="btn-icon" />
          <span>Create with Text</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary header-fal-btn"
          onClick={onOpenFalTextToVideo}
          title="Generate video with fal.ai Kling v1.6"
        >
          <SparklesIcon className="btn-icon" />
          <span>fal.ai Video</span>
        </button>

        {hasVideo ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onNewVideo}
              title="Upload another video"
            >
              <UploadIcon className="btn-icon" />
              <span>Change Video</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenExport}
              title="Export trimmed video"
            >
              <DownloadIcon className="btn-icon" />
              <span>Export Video</span>
            </button>
          </>
        ) : (
          <div className="status-tag">Ready to Edit</div>
        )}
      </div>
    </header>
  );
}
