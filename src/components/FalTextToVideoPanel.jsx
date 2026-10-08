import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon, SparklesIcon, FilmIcon, AlertTriangleIcon, CheckCircleIcon } from './Icons';
import { generateFalVideo, checkFalServerHealth } from '../services/falTextToVideoService';

// ─── Sub-components ──────────────────────────────────────────────────────────

function PillButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`fal-pill-btn${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ProgressBar({ progress, status }) {
  return (
    <div className="fal-progress-wrap">
      <div className="fal-progress-header">
        <span className="fal-progress-status">{status}</span>
        <span className="fal-progress-pct">{Math.round(progress)}%</span>
      </div>
      <div className="fal-progress-track">
        <div
          className="fal-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="fal-progress-hint">
        fal.ai Kling is rendering your video — this typically takes 1–3 minutes.
      </p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * FalTextToVideoPanel
 *
 * Props:
 *   isOpen          {boolean}
 *   onClose         {() => void}
 *   onImportToTimeline  {(videoData: { url, name, duration, isGenerated }) => void}
 */
export default function FalTextToVideoPanel({ isOpen, onClose, onImportToTimeline }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);

  const [serverHealth, setServerHealth] = useState(null); // null = unchecked
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState(null);

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [generatedRequestId, setGeneratedRequestId] = useState(null);

  const abortControllerRef = useRef(null);
  const previewVideoRef = useRef(null);

  // Check server health whenever the panel opens
  useEffect(() => {
    if (!isOpen) return;
    setServerHealth(null);
    setError(null);
    setGeneratedVideoUrl(null);
    setGeneratedRequestId(null);
    setProgress(0);
    setProgressStatus('');

    checkFalServerHealth().then((health) => setServerHealth(health));
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt describing the video you want to generate.');
      return;
    }

    setError(null);
    setGeneratedVideoUrl(null);
    setGeneratedRequestId(null);
    setIsGenerating(true);
    setProgress(0);
    setProgressStatus('Starting...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await generateFalVideo({
        prompt: prompt.trim(),
        aspectRatio,
        duration,
        onProgress: ({ status, progress: p }) => {
          setProgressStatus(status);
          setProgress(p);
        },
        signal: controller.signal,
      });

      setGeneratedVideoUrl(result.videoUrl);
      setGeneratedRequestId(result.requestId);
      setProgress(100);
      setProgressStatus('Generation complete!');
    } catch (err) {
      if (err.name === 'AbortError') {
        setProgressStatus('');
        setProgress(0);
      } else {
        console.error('[FalTextToVideoPanel] generation error:', err);
        setError(err.message || 'Video generation failed. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [prompt, aspectRatio, duration]);

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleImportToTimeline = () => {
    if (!generatedVideoUrl) return;

    const videoData = {
      url: generatedVideoUrl,
      name: `fal_generated_${Date.now()}.mp4`,
      duration,
      isGenerated: true,
      isFal: true,
    };

    if (onImportToTimeline) onImportToTimeline(videoData);
    onClose();
  };

  const handleRegenerate = () => {
    setGeneratedVideoUrl(null);
    setGeneratedRequestId(null);
    setError(null);
    setProgress(0);
    setProgressStatus('');
  };

  if (!isOpen) return null;

  const serverOk = serverHealth?.ok;
  const falConfigured = serverHealth?.falConfigured;
  const serverChecked = serverHealth !== null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content fal-ttv-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="fal-modal-icon-wrap">
              <FilmIcon className="modal-title-icon text-video-icon" />
            </div>
            <div>
              <h3>
                fal.ai Text-to-Video
                <span className="fal-brand-badge">Kling&nbsp;v1.6</span>
              </h3>
              <p className="modal-subtitle-text">
                Generate cinematic clips from a text prompt — powered by fal.ai
              </p>
            </div>
          </div>

          {/* Server status indicator */}
          <div className="fal-header-right">
            {serverChecked && (
              <div
                className={`fal-server-pill ${
                  !serverOk ? 'offline' : falConfigured ? 'ready' : 'no-key'
                }`}
              >
                <span className="fal-server-dot" />
                <span>
                  {!serverOk
                    ? 'Proxy server offline'
                    : falConfigured
                    ? 'fal.ai ready'
                    : 'FAL_KEY missing'}
                </span>
              </div>
            )}
            <button type="button" className="close-btn" onClick={onClose} disabled={isGenerating}>
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="modal-body fal-ttv-body">
          {/* Server-not-running warning */}
          {serverChecked && !serverOk && (
            <div className="fal-warning-banner">
              <AlertTriangleIcon className="warning-icon" />
              <div className="warning-content">
                <span className="warning-title">Proxy server not running</span>
                <p className="warning-desc">
                  Start the Express proxy with{' '}
                  <code className="fal-code">npm run server</code> in a separate terminal,
                  then refresh this panel.
                </p>
              </div>
            </div>
          )}

          {/* FAL_KEY not configured warning */}
          {serverChecked && serverOk && !falConfigured && (
            <div className="fal-warning-banner">
              <AlertTriangleIcon className="warning-icon" />
              <div className="warning-content">
                <span className="warning-title">FAL_KEY not configured</span>
                <p className="warning-desc">
                  Add your fal.ai key as an environment variable:{' '}
                  <code className="fal-code">FAL_KEY=your_key npm run server</code>
                  <br />
                  Get your key at{' '}
                  <a
                    href="https://fal.ai/dashboard/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fal-link"
                  >
                    fal.ai/dashboard/keys
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* ── Generated video preview ───────────────────────────────── */}
          {generatedVideoUrl && !isGenerating && (
            <div className="fal-preview-section">
              <div className="fal-preview-header">
                <CheckCircleIcon className="fal-check-icon" />
                <span className="fal-preview-title">Video generated successfully!</span>
              </div>
              <div className="fal-video-preview-wrap">
                <video
                  ref={previewVideoRef}
                  src={generatedVideoUrl}
                  className="fal-video-preview"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              {generatedRequestId && (
                <p className="fal-request-id">
                  Request ID: <code className="fal-code">{generatedRequestId}</code>
                </p>
              )}
              <div className="fal-preview-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRegenerate}
                >
                  Generate another
                </button>
                <a
                  href={generatedVideoUrl}
                  download={`fal_kling_${Date.now()}.mp4`}
                  className="btn btn-secondary fal-download-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↓ Download video
                </a>
                <button
                  type="button"
                  className="btn btn-primary fal-import-btn"
                  onClick={handleImportToTimeline}
                >
                  <FilmIcon className="btn-icon" />
                  <span>Import to Editor Timeline</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Prompt + options (hidden when video is ready) ─────────── */}
          {!generatedVideoUrl && (
            <>
              {/* Prompt input */}
              <div className="fal-prompt-section">
                <label className="fal-label" htmlFor="fal-prompt-input">
                  <SparklesIcon className="label-icon" />
                  <span>Video Prompt</span>
                </label>
                <textarea
                  id="fal-prompt-input"
                  className="fal-textarea"
                  rows={4}
                  placeholder="Describe the video you want to generate…&#10;Example: A serene mountain lake at golden hour, water reflecting snow-capped peaks, photorealistic cinematic 4K"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  maxLength={2000}
                />
                <div className="fal-char-count">{prompt.length}/2000</div>

                {/* Example prompts */}
                <div className="fal-example-pills">
                  <span className="fal-pills-label">Try:</span>
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      className="fal-example-pill"
                      onClick={() => setPrompt(ex.prompt)}
                      disabled={isGenerating}
                      title={ex.prompt}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options grid */}
              <div className="fal-options-grid">
                {/* Aspect ratio */}
                <div className="fal-option-col">
                  <label className="fal-option-label">Aspect Ratio</label>
                  <div className="fal-pill-group">
                    {ASPECT_RATIOS.map(({ value, label }) => (
                      <PillButton
                        key={value}
                        active={aspectRatio === value}
                        onClick={() => setAspectRatio(value)}
                      >
                        {label}
                      </PillButton>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="fal-option-col">
                  <label className="fal-option-label">Duration</label>
                  <div className="fal-pill-group">
                    <PillButton active={duration === 5} onClick={() => setDuration(5)}>
                      5 seconds
                    </PillButton>
                    <PillButton active={duration === 10} onClick={() => setDuration(10)}>
                      10 seconds
                    </PillButton>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Progress bar ─────────────────────────────────────────── */}
          {isGenerating && (
            <ProgressBar progress={progress} status={progressStatus} />
          )}

          {/* ── Error banner ──────────────────────────────────────────── */}
          {error && !isGenerating && (
            <div className="fal-error-banner">
              <AlertTriangleIcon className="fal-error-icon" />
              <div className="fal-error-body">
                <span className="fal-error-title">Generation failed</span>
                <p className="fal-error-desc">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="modal-footer">
          {isGenerating ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel generation
              </button>
              <div className="fal-footer-info">
                <span className="fal-spinner" />
                <span className="fal-footer-status">{progressStatus}</span>
              </div>
            </>
          ) : generatedVideoUrl ? (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                id="fal-generate-btn"
                className="btn btn-primary fal-generate-btn"
                onClick={handleGenerate}
                disabled={!prompt.trim() || (serverChecked && (!serverOk || !falConfigured))}
              >
                <SparklesIcon className="btn-icon" />
                <span>Generate Video with fal.ai</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Vertical' },
  { value: '1:1',  label: '1:1 Square' },
];

const EXAMPLE_PROMPTS = [
  {
    label: '🏔️ Mountain lake',
    prompt:
      'A serene mountain lake at golden hour, crystal-clear water reflecting snow-capped peaks and pine forests, photorealistic cinematic 4K, gentle breeze creating small ripples',
  },
  {
    label: '🌆 City timelapse',
    prompt:
      'Fast-motion aerial timelapse of a neon-lit futuristic city at night, flying cars, holographic billboards, cinematic wide-angle shot',
  },
  {
    label: '🌊 Ocean waves',
    prompt:
      'Majestic ocean waves crashing against rugged coastal cliffs at sunset, slow motion, dramatic lighting, photorealistic 8K',
  },
  {
    label: '🧑‍💻 Product reveal',
    prompt:
      'Sleek smartphone emerging from darkness, dramatic spotlight, product reveal cinematic shot, glossy surface reflections, dark background',
  },
];
