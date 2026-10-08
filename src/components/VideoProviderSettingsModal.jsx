import React, { useState } from 'react';
import { CloseIcon, CheckCircleIcon, SparklesIcon } from './Icons';
import {
  VIDEO_PROVIDERS,
  getVideoProviderConfig,
  saveVideoProviderConfig,
} from '../services/aiVideoService';

export default function VideoProviderSettingsModal({
  isOpen,
  onClose,
  onConfigSaved,
}) {
  const [config, setConfig] = useState(() => getVideoProviderConfig());
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveVideoProviderConfig(config);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved(config);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    const updated = {
      provider: 'none',
      apiKey: '',
      customEndpoint: '',
      model: 'gen3a_turbo',
    };
    setConfig(updated);
    saveVideoProviderConfig(updated);
    if (onConfigSaved) onConfigSaved(updated);
  };

  const selectedProviderObj = VIDEO_PROVIDERS.find((p) => p.id === config.provider);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content video-provider-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <SparklesIcon className="modal-title-icon" />
            <h3>AI Video Provider Settings</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <p className="settings-intro">
              Select and configure the AI Video Generation provider for rendering realistic UGC and cinematic scenes from text scripts.
            </p>

            {/* Provider Grid */}
            <div className="provider-selector-grid">
              {VIDEO_PROVIDERS.map((p) => {
                const isActive = config.provider === p.id;
                return (
                  <label
                    key={p.id}
                    className={`provider-card ${isActive ? 'active' : ''}`}
                    onClick={() => setConfig({ ...config, provider: p.id })}
                  >
                    <div className="provider-card-header">
                      <span className="provider-name">{p.name}</span>
                      <span
                        className={`provider-badge ${
                          p.id === 'none'
                            ? 'local-badge'
                            : p.id === 'fal'
                            ? 'free-badge'
                            : ''
                        }`}
                      >
                        {p.badge}
                      </span>
                    </div>
                    <p className="provider-desc">{p.description}</p>
                  </label>
                );
              })}
            </div>

            {/* Provider Credentials Form */}
            {config.provider !== 'none' && config.provider !== 'custom' && (
              <div className="form-group">
                <div className="label-row">
                  <label className="input-label">
                    {selectedProviderObj?.name} API Key
                  </label>
                  {selectedProviderObj?.website && (
                    <a
                      href={selectedProviderObj.website}
                      target="_blank"
                      rel="noreferrer"
                      className="helper-link"
                    >
                      Get {selectedProviderObj.name} Key ↗
                    </a>
                  )}
                </div>

                <div className="key-input-wrapper">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder={`Enter your ${selectedProviderObj?.name} API key...`}
                    value={config.apiKey || ''}
                    onChange={(e) =>
                      setConfig({ ...config, apiKey: e.target.value })
                    }
                    className="styled-input key-input"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="key-toggle-btn"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="field-hint">
                  Your key is stored securely in your browser's <code>localStorage</code>.
                </p>
              </div>
            )}

            {/* Custom Endpoint URL */}
            {config.provider === 'custom' && (
              <div className="form-group">
                <label className="input-label">Custom Webhook / Server URL</label>
                <input
                  type="text"
                  placeholder="https://api.yourserver.com/v1/generate-video"
                  value={config.customEndpoint || ''}
                  onChange={(e) =>
                    setConfig({ ...config, customEndpoint: e.target.value })
                  }
                  className="styled-input"
                />
                <p className="field-hint">
                  Server must accept POST requests with JSON payload containing <code>scenes</code> and <code>options</code>.
                </p>
              </div>
            )}

            {savedSuccess && (
              <div className="save-success-banner">
                <CheckCircleIcon className="success-inline-icon" />
                <span>Provider configuration saved successfully!</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {config.provider !== 'none' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClear}
                style={{ marginRight: 'auto' }}
              >
                Reset to None
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
