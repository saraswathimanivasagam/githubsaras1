import React, { useState, useRef } from 'react';
import { UploadIcon, SparklesIcon, VideoCameraIcon } from './Icons';
import { generateSampleVideo } from '../utils/sampleVideo';

export default function VideoUploader({ onVideoLoaded, onOpenTextToVideo }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }
    const url = URL.createObjectURL(file);
    onVideoLoaded({
      url,
      name: file.name,
      file,
      isDemo: false,
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsLoadingSample(true);
      const sample = await generateSampleVideo();
      onVideoLoaded({
        ...sample,
        isDemo: true,
      });
    } catch (err) {
      console.error('Failed to create sample video:', err);
      alert('Could not generate sample video. Try selecting a local file.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="uploader-container">
      {/* Featured "Create with Text" Hero Card */}
      <div
        className="text-to-video-hero-card"
        onClick={onOpenTextToVideo}
        role="button"
        tabIndex={0}
      >
        <div className="hero-card-left">
          <div className="hero-icon-bubble">
            <SparklesIcon className="hero-sparkle-icon" />
          </div>
          <div className="hero-text-content">
            <div className="hero-card-badge-row">
              <span className="badge-new-glow">NEW WORKFLOW</span>
              <span className="badge-format-tag">9:16 UGC & Commercials</span>
            </div>
            <h3 className="hero-card-title">Create Video with Text</h3>
            <p className="hero-card-desc">
              Convert scripts into 3-4 structured scenes with AI voiceover, storyboard planning, and visual prompts.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary hero-create-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTextToVideo();
          }}
        >
          <SparklesIcon className="btn-icon" />
          <span>Create with Text</span>
        </button>
      </div>

      <div className="or-divider-banner">
        <span className="or-line"></span>
        <span className="or-badge">OR UPLOAD EXISTING VIDEO</span>
        <span className="or-line"></span>
      </div>

      {/* Existing Upload Dropzone */}
      <div
        className={`dropzone-card ${isDragging ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files[0])}
        />

        <div className="upload-icon-wrapper">
          <UploadIcon className="large-upload-icon" />
        </div>

        <h2 className="upload-title">Drop your video here or click to browse</h2>
        <p className="upload-subtitle">
          Supports MP4, WebM, and MOV up to 4K resolution. Everything is processed privately inside your browser.
        </p>

        <div className="supported-badges">
          <span className="format-badge">.MP4</span>
          <span className="format-badge">.WEBM</span>
          <span className="format-badge">.MOV</span>
          <span className="format-badge">High FPS</span>
        </div>

        <div className="uploader-button-group">
          <button
            type="button"
            className="btn btn-primary browse-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <VideoCameraIcon className="btn-icon" />
            <span>Select Video File</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary text-create-secondary-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTextToVideo();
            }}
          >
            <SparklesIcon className="btn-icon" />
            <span>Create with Text</span>
          </button>
        </div>
      </div>

      <div className="sample-video-bar">
        <span className="divider-text">OR TEST SAMPLE</span>
        <button
          type="button"
          className="btn btn-sample"
          onClick={handleLoadSample}
          disabled={isLoadingSample}
        >
          <SparklesIcon className="btn-icon sparkle-spin" />
          <span>{isLoadingSample ? 'Generating Demo Video...' : 'Load Interactive Demo Video'}</span>
        </button>
        <p className="sample-hint">Test trimming, subtitles, and export without uploading your own file!</p>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-num">01</div>
          <div className="feature-body">
            <h3>Text to AI Video</h3>
            <p>Generate 3-4 structured UGC scenes from text scripts in Tamil, English, and more.</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-num">02</div>
          <div className="feature-body">
            <h3>Visual Trimmer</h3>
            <p>Precise millisecond start & end handles with live playhead scrubbing.</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-num">03</div>
          <div className="feature-body">
            <h3>AI Subtitles & Export</h3>
            <p>Real Whisper speech-to-text, viral subtitle styles, and in-browser WebM export.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
