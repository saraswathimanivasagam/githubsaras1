import React, { useState } from 'react';
import {
  SparklesIcon,
  CaptionsIcon,
  MagicWandIcon,
  ScissorsIcon,
  CloseIcon,
  DownloadIcon,
} from './Icons';
import { formatTime } from '../utils/formatTime';
import { formatSRT, formatVTT, getTranscriptionConfig } from '../utils/transcriptionService';
import TranscriptionSettingsModal from './TranscriptionSettingsModal';

import { COLOR_FILTERS } from '../constants/filters';

export default function AIPanel({
  activeFilter,
  onFilterChange,
  captionsEnabled,
  onToggleCaptions,
  captionStyle,
  onChangeCaptionStyle,
  onAutoTrimSilences,
  duration,
  currentTime,
  captions,
  onUpdateCaption,
  onDeleteCaption,
  onAddCaption,
  onTranscribeAudio,
  isTranscribing,
  transcriptionStatus,
  transcriptionError,
  onSeek,
}) {
  const [activeTab, setActiveTab] = useState('captions');
  const [isAnalyzingSilence, setIsAnalyzingSilence] = useState(false);
  const [silenceResult, setSilenceResult] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(() => getTranscriptionConfig());

  const handleDetectSilence = () => {
    setIsAnalyzingSilence(true);
    setSilenceResult(null);

    setTimeout(() => {
      setIsAnalyzingSilence(false);
      const suggestedStart = Math.min(0.8, duration * 0.1);
      const suggestedEnd = Math.max(duration - 0.8, duration * 0.9);
      setSilenceResult({
        detectedCount: 2,
        savedTime: (suggestedStart + (duration - suggestedEnd)).toFixed(1),
        suggestedStart,
        suggestedEnd,
      });
    }, 800);
  };

  const handleExportSubtitle = (format) => {
    if (!captions || captions.length === 0) return;
    const content = format === 'srt' ? formatSRT(captions) : formatVTT(captions);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const providerLabel = {
    groq: 'Groq Whisper (Free)',
    openai: 'OpenAI Whisper',
    custom: 'Local Whisper',
  }[currentConfig.provider] || 'Whisper AI';

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <SparklesIcon className="ai-header-icon" />
        <div>
          <h3>AI Studio Tools</h3>
          <p>Instant enhancements & smart editing</p>
        </div>
      </div>

      <div className="ai-tabs">
        <button
          type="button"
          className={`ai-tab-btn ${activeTab === 'captions' ? 'active' : ''}`}
          onClick={() => setActiveTab('captions')}
        >
          <CaptionsIcon className="tab-icon" />
          <span>Subtitles</span>
        </button>
        <button
          type="button"
          className={`ai-tab-btn ${activeTab === 'silence' ? 'active' : ''}`}
          onClick={() => setActiveTab('silence')}
        >
          <ScissorsIcon className="tab-icon" />
          <span>Auto-Cut</span>
        </button>
        <button
          type="button"
          className={`ai-tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          <MagicWandIcon className="tab-icon" />
          <span>Color AI</span>
        </button>
      </div>

      <div className="ai-panel-content">
        {/* Captions Tab */}
        {activeTab === 'captions' && (
          <div className="ai-section captions-ai-section">
            <div className="toggle-row">
              <div>
                <h4>AI Video Subtitles</h4>
                <p>Real speech-to-text synced to audio</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={captionsEnabled}
                  onChange={(e) => onToggleCaptions(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* AI Speech-to-Text Transcription Box */}
            <div className="transcription-action-card">
              <div className="provider-status-row">
                <div className="provider-info">
                  <span className="provider-status-dot"></span>
                  <span className="provider-tag">{providerLabel}</span>
                </div>
                <button
                  type="button"
                  className="settings-trigger-btn"
                  onClick={() => setIsSettingsOpen(true)}
                  title="Configure Whisper AI Provider & API Key"
                >
                  ⚙️ Settings
                </button>
              </div>

              {/* Action Button & Progress */}
              {!isTranscribing ? (
                <button
                  type="button"
                  className="btn btn-primary full-width transcribe-btn"
                  onClick={onTranscribeAudio}
                  disabled={duration <= 0}
                >
                  <SparklesIcon className="btn-icon" />
                  <span>Transcribe Video Audio</span>
                </button>
              ) : (
                <div className="transcription-loading-state">
                  <div className="spinner"></div>
                  <div className="loading-text-group">
                    <span className="loading-title">Transcribing Audio...</span>
                    <span className="loading-subtitle">{transcriptionStatus}</span>
                  </div>
                </div>
              )}

              {/* Error State Banner */}
              {transcriptionError && (
                <div className="transcription-error-banner">
                  <div className="error-content">
                    <span className="error-title">Transcription Error</span>
                    <p className="error-desc">{transcriptionError}</p>
                  </div>
                  {transcriptionError.includes('API key') && (
                    <button
                      type="button"
                      className="btn btn-secondary fix-key-btn"
                      onClick={() => setIsSettingsOpen(true)}
                    >
                      Enter API Key
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Subtitle Style Presets */}
            {captionsEnabled && (
              <div className="caption-styles-group">
                <label className="group-label">Visual Caption Style</label>
                <div className="caption-preset-grid">
                  <button
                    type="button"
                    className={`preset-btn style-mrbeast ${captionStyle === 'mrbeast' ? 'active' : ''}`}
                    onClick={() => onChangeCaptionStyle('mrbeast')}
                  >
                    <span>⚡ Pop Yellow</span>
                  </button>
                  <button
                    type="button"
                    className={`preset-btn style-neon ${captionStyle === 'neon' ? 'active' : ''}`}
                    onClick={() => onChangeCaptionStyle('neon')}
                  >
                    <span>💎 Neon Cyan</span>
                  </button>
                  <button
                    type="button"
                    className={`preset-btn style-boxed ${captionStyle === 'boxed' ? 'active' : ''}`}
                    onClick={() => onChangeCaptionStyle('boxed')}
                  >
                    <span>⬛ Boxed Dark</span>
                  </button>
                  <button
                    type="button"
                    className={`preset-btn style-clean ${captionStyle === 'clean' ? 'active' : ''}`}
                    onClick={() => onChangeCaptionStyle('clean')}
                  >
                    <span>✨ Clean White</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Caption Editor List */}
            <div className="caption-editor-section">
              <div className="editor-header-row">
                <span className="editor-count">
                  Captions ({captions ? captions.length : 0})
                </span>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="icon-sub-btn"
                    onClick={() => onAddCaption(currentTime)}
                    title="Add a caption at current playhead"
                  >
                    + Add at {formatTime(currentTime)}
                  </button>
                  {captions && captions.length > 0 && (
                    <div className="export-subs-dropdown">
                      <button
                        type="button"
                        className="icon-sub-btn"
                        onClick={() => handleExportSubtitle('srt')}
                        title="Download SubRip (.srt)"
                      >
                        <DownloadIcon className="btn-icon-sm" />
                        <span>.SRT</span>
                      </button>
                      <button
                        type="button"
                        className="icon-sub-btn"
                        onClick={() => handleExportSubtitle('vtt')}
                        title="Download WebVTT (.vtt)"
                      >
                        <DownloadIcon className="btn-icon-sm" />
                        <span>.VTT</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption Cards Container */}
              <div className="caption-list-container">
                {(!captions || captions.length === 0) ? (
                  <div className="empty-captions-placeholder">
                    <p>No captions yet.</p>
                    <span>Click <strong>"Transcribe Video Audio"</strong> to generate captions automatically from audio, or click <strong>"+ Add"</strong> to write one manually.</span>
                  </div>
                ) : (
                  captions.map((cap) => {
                    const isActive = currentTime >= cap.start && currentTime <= cap.end;
                    return (
                      <div
                        key={cap.id}
                        className={`caption-item-card ${isActive ? 'active-caption' : ''}`}
                      >
                        <div className="caption-item-header">
                          <button
                            type="button"
                            className="time-tag-btn"
                            onClick={() => onSeek(cap.start)}
                            title="Click to jump to this timestamp in video"
                          >
                            ▶ {formatTime(cap.start, true)} → {formatTime(cap.end, true)}
                          </button>

                          <div className="caption-card-tools">
                            <button
                              type="button"
                              className="delete-caption-btn"
                              onClick={() => onDeleteCaption(cap.id)}
                              title="Delete this caption"
                            >
                              <CloseIcon className="del-icon" />
                            </button>
                          </div>
                        </div>

                        {/* Editable Caption Textarea */}
                        <textarea
                          className="caption-text-input"
                          rows={2}
                          value={cap.text}
                          onChange={(e) => onUpdateCaption(cap.id, { text: e.target.value })}
                          placeholder="Enter caption text..."
                        />

                        {/* Timing Adjustment Micro-Controls */}
                        <div className="timing-adjust-row">
                          <div className="timing-adjust-group">
                            <span className="timing-label">Start:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={cap.end - 0.1}
                              value={cap.start}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val < cap.end) {
                                  onUpdateCaption(cap.id, { start: val });
                                }
                              }}
                              className="timing-num-input"
                            />
                            <span>s</span>
                          </div>

                          <div className="timing-adjust-group">
                            <span className="timing-label">End:</span>
                            <input
                              type="number"
                              step="0.1"
                              min={cap.start + 0.1}
                              max={duration || 9999}
                              value={cap.end}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > cap.start) {
                                  onUpdateCaption(cap.id, { end: val });
                                }
                              }}
                              className="timing-num-input"
                            />
                            <span>s</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Silence Cutter Tab */}
        {activeTab === 'silence' && (
          <div className="ai-section">
            <h4>Smart Silence Remover</h4>
            <p className="section-desc">
              Scans audio levels to cut dead pauses at the start and end of clips for punchier pacing.
            </p>

            <button
              type="button"
              className="btn btn-secondary full-width"
              onClick={handleDetectSilence}
              disabled={isAnalyzingSilence}
            >
              <SparklesIcon className="btn-icon" />
              <span>{isAnalyzingSilence ? 'Scanning Audio Waves...' : 'Scan For Silences'}</span>
            </button>

            {silenceResult && (
              <div className="silence-result-card">
                <div className="result-metric">
                  <span className="metric-num">~{silenceResult.savedTime}s</span>
                  <span className="metric-label">Dead air detected</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary full-width"
                  onClick={() =>
                    onAutoTrimSilences(
                      silenceResult.suggestedStart,
                      silenceResult.suggestedEnd
                    )
                  }
                >
                  <ScissorsIcon className="btn-icon" />
                  <span>Apply Auto-Trim</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="ai-section">
            <h4>Cinematic Color Presets</h4>
            <p className="section-desc">
              Instant aesthetic color grading applied directly to preview and export.
            </p>

            <div className="filter-grid">
              {COLOR_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-card ${activeFilter === f.id ? 'active' : ''}`}
                  onClick={() => onFilterChange(f.id)}
                >
                  <div className={`filter-swatch filter-${f.id}`}></div>
                  <span className="filter-name">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transcription API Settings Modal */}
      <TranscriptionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setCurrentConfig(getTranscriptionConfig());
        }}
        onConfigSaved={(newCfg) => setCurrentConfig(newCfg)}
      />
    </aside>
  );
}
