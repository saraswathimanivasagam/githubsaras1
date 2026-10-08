import React, { useState } from 'react';
import { CloseIcon, CheckCircleIcon, SparklesIcon } from './Icons';
import { getTranscriptionConfig, saveTranscriptionConfig } from '../utils/transcriptionService';

export default function TranscriptionSettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [config, setConfig] = useState(() => getTranscriptionConfig());
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveTranscriptionConfig(config);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved(config);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleClearKey = () => {
    const updated = { ...config, apiKey: '' };
    setConfig(updated);
    saveTranscriptionConfig(updated);
    if (onConfigSaved) onConfigSaved(updated);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content transcription-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <SparklesIcon className="modal-title-icon" />
            <h3>AI Transcription Setup</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <p className="settings-intro">
              ClipAI uses real Whisper AI to transcribe audio from your video. Select a provider below.
            </p>

            {/* Provider Selection Cards */}
            <div className="provider-selector-grid">
              <label
                className={`provider-card ${config.provider === 'groq' ? 'active' : ''}`}
                onClick={() => setConfig({ ...config, provider: 'groq' })}
              >
                <div className="provider-card-header">
                  <span className="provider-name">Groq Whisper</span>
                  <span className="provider-badge free-badge">Free Tier</span>
                </div>
                <p className="provider-desc">
                  Near-instant transcription using <code>whisper-large-v3-turbo</code>. Free API access without credit card.
                </p>
              </label>

              <label
                className={`provider-card ${config.provider === 'openai' ? 'active' : ''}`}
                onClick={() => setConfig({ ...config, provider: 'openai' })}
              >
                <div className="provider-card-header">
                  <span className="provider-name">OpenAI Whisper</span>
                  <span className="provider-badge">Standard</span>
                </div>
                <p className="provider-desc">
                  Industry standard <code>whisper-1</code> model. Uses your standard OpenAI API key.
                </p>
              </label>

              <label
                className={`provider-card ${config.provider === 'custom' ? 'active' : ''}`}
                onClick={() => setConfig({ ...config, provider: 'custom' })}
              >
                <div className="provider-card-header">
                  <span className="provider-name">Local / Self-Hosted</span>
                  <span className="provider-badge local-badge">No Key</span>
                </div>
                <p className="provider-desc">
                  Connect to Faster-Whisper, Whisper.cpp, or LocalAI running on your own machine.
                </p>
              </label>
            </div>

            {/* API Key Input (if Groq or OpenAI) */}
            {config.provider !== 'custom' ? (
              <div className="form-group">
                <div className="label-row">
                  <label className="input-label">
                    {config.provider === 'groq' ? 'Groq API Key' : 'OpenAI API Key'}
                  </label>
                  {config.provider === 'groq' && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="helper-link"
                    >
                      Get Free Groq Key ↗
                    </a>
                  )}
                  {config.provider === 'openai' && (
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="helper-link"
                    >
                      Get OpenAI Key ↗
                    </a>
                  )}
                </div>

                <div className="key-input-wrapper">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder={
                      config.provider === 'groq'
                        ? 'gsk_...'
                        : 'sk-proj-...'
                    }
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="styled-input key-input"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="key-toggle-btn"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>

                <p className="field-hint">
                  Your API key is stored locally in your browser's <code>localStorage</code> and never sent to any intermediary server.
                </p>
              </div>
            ) : (
              /* Custom Endpoint Input */
              <div className="form-group">
                <label className="input-label">Local Whisper Endpoint URL</label>
                <input
                  type="text"
                  placeholder="http://localhost:8000/v1/audio/transcriptions"
                  value={config.customEndpoint}
                  onChange={(e) => setConfig({ ...config, customEndpoint: e.target.value })}
                  className="styled-input"
                />
                <p className="field-hint">
                  Ensure your local server accepts POST requests with <code>multipart/form-data</code> and has CORS enabled for <code>http://localhost:5173</code>.
                </p>
              </div>
            )}

            {/* Language Selection */}
            <div className="form-group">
              <label className="input-label">Audio Language</label>
              <select
                value={config.language || 'en'}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
                className="styled-select"
              >
                <option value="en">English (en)</option>
                <option value="auto">Auto-Detect Language</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
                <option value="it">Italian (it)</option>
                <option value="pt">Portuguese (pt)</option>
                <option value="ja">Japanese (ja)</option>
                <option value="zh">Chinese (zh)</option>
                <option value="hi">Hindi (hi)</option>
              </select>
            </div>

            {savedSuccess && (
              <div className="save-success-banner">
                <CheckCircleIcon className="success-inline-icon" />
                <span>Configuration saved successfully!</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {config.apiKey && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearKey}
                style={{ marginRight: 'auto' }}
              >
                Remove Key
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <span>Save & Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
