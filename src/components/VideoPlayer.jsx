import React, { useRef } from 'react';
import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  RotateCwIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from './Icons';
import { formatTime } from '../utils/formatTime';

export default function VideoPlayer({
  videoSrc,
  currentTime,
  duration,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  trimStart,
  trimEnd,
  aspectRatio,
  filterStyle,
  captionsEnabled,
  currentCaption,
  captionStyle,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onRateChange,
  videoRef,
}) {
  const containerRef = useRef(null);

  // Jump forwards or backwards
  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    const target = Math.max(trimStart, Math.min(trimEnd, videoRef.current.currentTime + seconds));
    onSeek(target);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    } else {
      containerRef.current.requestFullscreen().catch(console.warn);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`player-container aspect-${aspectRatio.replace(':', '-')}`}
    >
      <div className="video-viewport">
        <video
          ref={videoRef}
          src={videoSrc}
          className="main-video-element"
          style={{ filter: filterStyle || 'none' }}
          playsInline
          onClick={onPlayPause}
        />

        {/* Big play button overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            className="big-play-btn"
            onClick={onPlayPause}
            aria-label="Play video"
          >
            <PlayIcon className="big-play-icon" />
          </button>
        )}

        {/* AI Dynamic Captions Overlay */}
        {captionsEnabled && currentCaption && (
          <div className={`caption-overlay-container ${captionStyle}`}>
            <span className="caption-text-bubble">
              {currentCaption}
            </span>
          </div>
        )}
      </div>

      {/* Embedded Player Controls Bar */}
      <div className="player-controls-bar">
        <div className="controls-left">
          <button
            type="button"
            className="control-btn play-pause-btn"
            onClick={onPlayPause}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            className="control-btn"
            onClick={() => handleSkip(-5)}
            title="Rewind 5s"
          >
            <RotateCcwIcon />
          </button>

          <button
            type="button"
            className="control-btn"
            onClick={() => handleSkip(5)}
            title="Forward 5s"
          >
            <RotateCwIcon />
          </button>

          <div className="time-display">
            <span className="time-current">{formatTime(currentTime, true)}</span>
            <span className="time-sep">/</span>
            <span className="time-total">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="controls-right">
          {/* Volume Control */}
          <div className="volume-control-group">
            <button
              type="button"
              className="control-btn mute-btn"
              onClick={onMuteToggle}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Speed Selector */}
          <div className="speed-selector-group">
            <select
              value={playbackRate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="speed-select"
              title="Playback Speed"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="control-btn"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
