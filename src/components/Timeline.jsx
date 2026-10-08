import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScissorsIcon, RotateCcwIcon } from './Icons';
import { formatTime, clamp } from '../utils/formatTime';

export default function Timeline({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  captions,
  captionsEnabled,
  onSeek,
  onTrimChange,
  onResetTrim,
}) {
  const trackRef = useRef(null);
  const [activeDrag, setActiveDrag] = useState(null); // 'playhead' | 'start' | 'end' | null

  // Helper to convert mouse X to timestamp
  const getTimestampFromEvent = useCallback(
    (e) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
      const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
      return fraction * duration;
    },
    [duration]
  );

  // Handle dragging
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e) => {
      const time = getTimestampFromEvent(e);
      if (activeDrag === 'playhead') {
        onSeek(clamp(time, trimStart, trimEnd));
      } else if (activeDrag === 'start') {
        // Enforce minimum 0.5s segment
        const newStart = clamp(time, 0, trimEnd - 0.5);
        onTrimChange(newStart, trimEnd);
        onSeek(newStart);
      } else if (activeDrag === 'end') {
        const newEnd = clamp(time, trimStart + 0.5, duration);
        onTrimChange(trimStart, newEnd);
        onSeek(newEnd);
      }
    };

    const handlePointerUp = () => {
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeDrag, duration, trimStart, trimEnd, onSeek, onTrimChange, getTimestampFromEvent]);

  // Click on track to seek
  const handleTrackClick = (e) => {
    // Only seek if clicking directly on track, not handles
    if (activeDrag) return;
    const time = getTimestampFromEvent(e);
    onSeek(clamp(time, trimStart, trimEnd));
  };

  // Generate tick markers
  const ticksCount = 10;
  const tickTimes = Array.from({ length: ticksCount + 1 }, (_, i) => (duration / ticksCount) * i);

  // Percent calculations
  const startPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPercent = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const selectedDuration = Math.max(0, trimEnd - trimStart);

  return (
    <div className="timeline-container">
      {/* Top Header / Trim Stats */}
      <div className="timeline-toolbar">
        <div className="timeline-actions">
          <button
            type="button"
            className="action-btn"
            onClick={() => onTrimChange(currentTime, trimEnd)}
            title="Set start trim point to current playhead"
          >
            <ScissorsIcon className="action-icon" />
            <span>Set Start [{formatTime(currentTime)}]</span>
          </button>

          <button
            type="button"
            className="action-btn"
            onClick={() => onTrimChange(trimStart, currentTime)}
            title="Set end trim point to current playhead"
          >
            <ScissorsIcon className="action-icon flip-icon" />
            <span>Set End [{formatTime(currentTime)}]</span>
          </button>

          <button
            type="button"
            className="action-btn reset-btn"
            onClick={onResetTrim}
            title="Reset trim to full duration"
          >
            <RotateCcwIcon className="action-icon" />
            <span>Reset Trim</span>
          </button>
        </div>

        <div className="trim-stats-badge">
          <span className="stats-label">Clip Range:</span>
          <span className="stats-value">
            {formatTime(trimStart, true)} → {formatTime(trimEnd, true)}
          </span>
          <span className="stats-duration">
            ({formatTime(selectedDuration, true)} selected)
          </span>
        </div>
      </div>

      {/* Time Ruler */}
      <div className="time-ruler">
        {tickTimes.map((t, idx) => (
          <div
            key={idx}
            className="ruler-tick"
            style={{ left: `${(idx / ticksCount) * 100}%` }}
          >
            <div className="tick-notch"></div>
            <span className="tick-label">{formatTime(t)}</span>
          </div>
        ))}
      </div>

      {/* Main Track Bar */}
      <div
        ref={trackRef}
        className="timeline-track"
        onPointerDown={handleTrackClick}
      >
        {/* Visual Waveform / Video Strip Background Mock */}
        <div className="timeline-filmstrip">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="filmstrip-frame">
              <div className="film-hole top"></div>
              <div className="film-hole bottom"></div>
            </div>
          ))}
        </div>

        {/* Visual Subtitle Track (rendered on the timeline) */}
        {captionsEnabled && captions && captions.length > 0 && (
          <div className="timeline-captions-overlay">
            {captions.map((cap) => {
              const left = duration > 0 ? (cap.start / duration) * 100 : 0;
              const width = duration > 0 ? Math.max(1, ((cap.end - cap.start) / duration) * 100) : 0;
              const isActive = currentTime >= cap.start && currentTime <= cap.end;
              return (
                <div
                  key={cap.id}
                  className={`timeline-caption-pill ${isActive ? 'active-pill' : ''}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(cap.start);
                  }}
                  title={`[${formatTime(cap.start)} - ${formatTime(cap.end)}] ${cap.text}`}
                >
                  <span className="caption-pill-text">{cap.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Trim Dimmed Left Region (cut out) */}
        <div
          className="trim-shade left-shade"
          style={{ width: `${startPercent}%` }}
        ></div>

        {/* Active Trimmed Region */}
        <div
          className="trim-active-region"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(0, endPercent - startPercent)}%`,
          }}
        >
          {/* Start Handle */}
          <div
            className="trim-handle start-handle"
            onPointerDown={(e) => {
              e.stopPropagation();
              setActiveDrag('start');
            }}
            title="Drag to trim start"
          >
            <div className="handle-bar"></div>
            <span className="handle-tag">IN</span>
          </div>

          {/* End Handle */}
          <div
            className="trim-handle end-handle"
            onPointerDown={(e) => {
              e.stopPropagation();
              setActiveDrag('end');
            }}
            title="Drag to trim end"
          >
            <div className="handle-bar"></div>
            <span className="handle-tag">OUT</span>
          </div>
        </div>

        {/* Trim Dimmed Right Region (cut out) */}
        <div
          className="trim-shade right-shade"
          style={{
            left: `${endPercent}%`,
            width: `${Math.max(0, 100 - endPercent)}%`,
          }}
        ></div>

        {/* Playhead Cursor */}
        <div
          className="timeline-playhead"
          style={{ left: `${playheadPercent}%` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveDrag('playhead');
          }}
        >
          <div className="playhead-pin">
            <span>{formatTime(currentTime, true)}</span>
          </div>
          <div className="playhead-line"></div>
        </div>
      </div>
    </div>
  );
}
