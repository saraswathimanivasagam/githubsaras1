import React, { useState } from 'react';
import {
  CloseIcon,
  SparklesIcon,
  FilmIcon,
  TextIcon,
  SettingsIcon,
  AlertTriangleIcon,
} from './Icons';
import { generateScenePlan } from '../utils/scenePlanner';
import {
  getVideoProviderConfig,
  isProviderConfigured,
  generateAIVideo,
  getProviderDisplayName,
} from '../services/aiVideoService';
import VideoProviderSettingsModal from './VideoProviderSettingsModal';

const SAMPLE_SCRIPTS = [
  {
    label: '🥥 Tamil: Chilled Coconut Water',
    text: 'ஒரு 30 வயது பெண் வெயிலில் சோர்வாக இருக்கிறார். அவள் chilled green coconut water குடிக்கிறார்.',
    lang: 'ta',
    style: 'Realistic UGC',
  },
  {
    label: '☕ UGC: Morning Energy Coffee',
    text: 'A busy young professional waking up tired on Monday morning. Brewing a rich dark roast coffee that brings instant focus and bright energy.',
    lang: 'en',
    style: 'Realistic UGC',
  },
  {
    label: '👟 Commercial: Dawn Runner',
    text: 'An athlete sprinting through neon-lit misty city streets at 5 AM. Pushing past limits with durable high-performance running shoes.',
    lang: 'en',
    style: 'Cinematic Film',
  },
];

const STYLES = [
  'Realistic UGC',
  'Cinematic Film',
  'Hyper-Realistic 4K',
  'Anime Style',
  '3D Animation',
  'Vintage 90s Camcorder',
];

const LANGUAGES = [
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'en', name: 'English (US)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

const VOICES = [
  { id: 'female-warm', name: 'Female - Warm & Conversational (Priya / Sarah)' },
  { id: 'male-deep', name: 'Male - Deep & Confident (Karthik / Alex)' },
  { id: 'female-ugc', name: 'Female - Energetic UGC Creator (Ananya)' },
  { id: 'male-commercial', name: 'Male - Dynamic Commercial Host (Arun)' },
];

export default function TextToVideoModal({
  isOpen,
  onClose,
  onVideoGenerated,
}) {
  const [scriptText, setScriptText] = useState(
    'ஒரு 30 வயது பெண் வெயிலில் சோர்வாக இருக்கிறார். அவள் chilled green coconut water குடிக்கிறார்.'
  );
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [visualStyle, setVisualStyle] = useState('Realistic UGC');
  const [voiceLanguage, setVoiceLanguage] = useState('ta');
  const [voice, setVoice] = useState('female-warm');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);

  const [isProviderSettingsOpen, setIsProviderSettingsOpen] = useState(false);
  const [providerConfig, setProviderConfig] = useState(() =>
    getVideoProviderConfig()
  );

  // Initialize scenes directly with initial script
  const [scenes, setScenes] = useState(() =>
    generateScenePlan(
      'ஒரு 30 வயது பெண் வெயிலில் சோர்வாக இருக்கிறார். அவள் chilled green coconut water குடிக்கிறார்.',
      {
        duration: 15,
        aspectRatio: '9:16',
        visualStyle: 'Realistic UGC',
        voiceLanguage: 'ta',
        voice: 'female-warm',
      }
    )
  );

  // Explicit function to re-plan scenes from text & options
  const handlePlanScenes = (customText = scriptText, customOpts = {}) => {
    const textToUse = customText !== undefined ? customText : scriptText;
    if (!textToUse || !textToUse.trim()) return;

    const plan = generateScenePlan(textToUse, {
      duration,
      aspectRatio,
      visualStyle,
      voiceLanguage,
      voice,
      ...customOpts,
    });
    setScenes(plan);
  };

  if (!isOpen) return null;

  const hasConfiguredProvider = isProviderConfigured(providerConfig);

  const handleUpdateScene = (id, field, value) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleGenerate = async () => {
    setError(null);

    // Strict validation: if no provider is configured, do not pretend or fake URLs
    if (!hasConfiguredProvider) {
      setError(
        'Provider not configured: No AI video generation provider is connected. Please click "Configure Provider" below to add your Runway, Luma, Fal.ai API key or custom endpoint URL before generating.'
      );
      return;
    }

    if (!scenes || scenes.length === 0) {
      setError('Please enter a script to generate a scene plan first.');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Initiating AI video generation...');
    setGenerationProgress(5);

    try {
      const result = await generateAIVideo({
        prompt: scriptText,
        scenes,
        options: {
          duration,
          aspectRatio,
          visualStyle,
          voiceLanguage,
          voice,
        },
        onProgress: ({ status, progress }) => {
          setGenerationStatus(status);
          setGenerationProgress(progress);
        },
      });

      // Pass generated video to studio
      if (onVideoGenerated) {
        onVideoGenerated(result, scenes);
      }
      onClose();
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Video generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content text-to-video-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <FilmIcon className="modal-title-icon text-video-icon" />
            <div>
              <h3>Text to AI Video Studio</h3>
              <p className="modal-subtitle-text">
                Generate high-conversion UGC & commercial videos from scripts
              </p>
            </div>
          </div>

          <div className="header-actions-right">
            <button
              type="button"
              className={`provider-status-pill ${
                hasConfiguredProvider ? 'connected' : 'unconfigured'
              }`}
              onClick={() => setIsProviderSettingsOpen(true)}
              title="Click to configure AI Video Provider"
            >
              <SettingsIcon className="btn-icon-xs" />
              <span>
                {hasConfiguredProvider
                  ? `Provider: ${getProviderDisplayName(providerConfig.provider)}`
                  : 'Provider: Not Configured'}
              </span>
            </button>

            <button type="button" className="close-btn" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="modal-body text-video-modal-body">
          {/* Section 1: Script Input & Example Presets */}
          <div className="script-input-section">
            <div className="label-row">
              <label className="input-label">
                <TextIcon className="label-icon" />
                <span>Video Script / Prompt</span>
              </label>
              <span className="char-count">{scriptText.length} characters</span>
            </div>

            <textarea
              className="styled-textarea script-textarea"
              rows={3}
              placeholder="Describe your video story, product, or script in any language (e.g., Tamil, English)..."
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
            />

            {/* Quick Sample Script Pills */}
            <div className="sample-pills-row">
              <span className="pills-label">Try example:</span>
              {SAMPLE_SCRIPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="sample-script-pill"
                  onClick={() => {
                    setScriptText(sample.text);
                    setVoiceLanguage(sample.lang);
                    setVisualStyle(sample.style);
                    handlePlanScenes(sample.text, {
                      voiceLanguage: sample.lang,
                      visualStyle: sample.style,
                    });
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Video Configuration Grid */}
          <div className="video-options-grid">
            {/* Duration (15s default) */}
            <div className="option-col">
              <label className="option-label">Duration</label>
              <div className="toggle-pill-group">
                <button
                  type="button"
                  className={`pill-btn ${duration === 15 ? 'active' : ''}`}
                  onClick={() => setDuration(15)}
                >
                  15s (Optimal)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${duration === 30 ? 'active' : ''}`}
                  onClick={() => setDuration(30)}
                >
                  30s
                </button>
                <button
                  type="button"
                  className={`pill-btn ${duration === 60 ? 'active' : ''}`}
                  onClick={() => setDuration(60)}
                >
                  60s
                </button>
              </div>
            </div>

            {/* Aspect Ratio (9:16 default) */}
            <div className="option-col">
              <label className="option-label">Aspect Ratio</label>
              <div className="toggle-pill-group">
                <button
                  type="button"
                  className={`pill-btn ${aspectRatio === '9:16' ? 'active' : ''}`}
                  onClick={() => setAspectRatio('9:16')}
                >
                  9:16 (Reels/TikTok)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
                  onClick={() => setAspectRatio('16:9')}
                >
                  16:9 (Landscape)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
                  onClick={() => setAspectRatio('1:1')}
                >
                  1:1 (Square)
                </button>
              </div>
            </div>

            {/* Visual Style (Realistic UGC default) */}
            <div className="option-col">
              <label className="option-label">Visual Style</label>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="styled-select"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Language */}
            <div className="option-col">
              <label className="option-label">Voice Language</label>
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="styled-select"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Selection */}
            <div className="option-col full-span">
              <label className="option-label">AI Voice Selection</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="styled-select"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Generated 3-4 Scene Plan */}
          <div className="scene-plan-section">
            <div className="scene-plan-header">
              <div className="plan-title-group">
                <SparklesIcon className="plan-icon" />
                <h4>Generated Scene Plan ({scenes.length} Scenes)</h4>
              </div>
              <div className="plan-header-actions">
                <span className="plan-duration-badge">Total: {duration}s</span>
                <button
                  type="button"
                  className="icon-sub-btn regenerate-plan-btn"
                  onClick={() => handlePlanScenes()}
                  title="Update scene plan from current script & options"
                >
                  <SparklesIcon className="btn-icon-xs" />
                  <span>Update Plan</span>
                </button>
              </div>
            </div>

            <p className="scene-plan-hint">
              Review and edit the visual prompts, camera shot types, and narration before generating:
            </p>

            {/* Scene Cards List */}
            <div className="scenes-cards-container">
              {scenes.map((scene) => (
                <div key={scene.id} className="scene-plan-card">
                  <div className="scene-card-top">
                    <div className="scene-badge-group">
                      <span className="scene-number-tag">Scene {scene.sceneNumber}</span>
                      <span className="scene-duration-tag">{scene.duration}s</span>
                      <span className="scene-shot-tag">{scene.cameraShot}</span>
                    </div>
                    <span className="scene-card-title">{scene.title}</span>
                  </div>

                  {/* Visual Prompt Input */}
                  <div className="scene-field-group">
                    <span className="scene-field-label">Visual Shot Description:</span>
                    <textarea
                      rows={2}
                      className="scene-text-input"
                      value={scene.visualPrompt}
                      onChange={(e) =>
                        handleUpdateScene(scene.id, 'visualPrompt', e.target.value)
                      }
                    />
                  </div>

                  {/* Voiceover Narration Input */}
                  <div className="scene-field-group">
                    <span className="scene-field-label">Voiceover / Dialogue:</span>
                    <input
                      type="text"
                      className="scene-narration-input"
                      value={scene.narration}
                      onChange={(e) =>
                        handleUpdateScene(scene.id, 'narration', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Warning Notice (Requirement 9: Do not pretend video was generated) */}
          {!hasConfiguredProvider && (
            <div className="provider-warning-banner">
              <AlertTriangleIcon className="warning-icon" />
              <div className="warning-content">
                <span className="warning-title">AI Video Provider Not Configured</span>
                <p className="warning-desc">
                  To render the final video stream, connect an AI video provider (Runway Gen-3, Luma Dream Machine, Fal.ai, or custom GPU endpoint).
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary configure-provider-btn"
                onClick={() => setIsProviderSettingsOpen(true)}
              >
                <SettingsIcon className="btn-icon-xs" />
                <span>Configure Provider</span>
              </button>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="transcription-error-banner">
              <div className="error-content">
                <span className="error-title">Generation Notice</span>
                <p className="error-desc">{error}</p>
              </div>
            </div>
          )}

          {/* Generating Loading State */}
          {isGenerating && (
            <div className="export-progress-container text-video-progress">
              <div className="progress-info">
                <span className="progress-status-text">{generationStatus}</span>
                <span className="progress-percent">{generationProgress}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="progress-subtext">
                Processing scenes through AI video generation provider...
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary generate-video-action-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <SparklesIcon className="btn-icon" />
            <span>
              {isGenerating
                ? 'Generating Video...'
                : hasConfiguredProvider
                ? 'Generate AI Video'
                : 'Generate AI Video (Setup Required)'}
            </span>
          </button>
        </div>
      </div>

      {/* Video Provider Settings Modal */}
      <VideoProviderSettingsModal
        isOpen={isProviderSettingsOpen}
        onClose={() => {
          setIsProviderSettingsOpen(false);
          setProviderConfig(getVideoProviderConfig());
        }}
        onConfigSaved={(newCfg) => setProviderConfig(newCfg)}
      />
    </div>
  );
}
