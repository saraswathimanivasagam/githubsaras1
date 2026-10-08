import { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import AIPanel from './components/AIPanel';
import { COLOR_FILTERS } from './constants/filters';
import ExportModal from './components/ExportModal';
import TextToVideoModal from './components/TextToVideoModal';
import FalTextToVideoPanel from './components/FalTextToVideoPanel';
import { exportTrimmedVideo } from './utils/videoExporter';
import { extractAudioFromVideo } from './utils/audioExtractor';
import { transcribeAudio } from './utils/transcriptionService';
import './App.css';

// Demo sample captions for synthetic offline demo playground only
const DEMO_PLAYGROUND_CAPTIONS = [
  { id: 'demo-1', start: 0.0, end: 2.5, text: '✨ WELCOME TO CLIPAI STUDIO' },
  { id: 'demo-2', start: 2.5, end: 5.0, text: '✂️ PRECISE TIMELINE TRIMMING' },
  { id: 'demo-3', start: 5.0, end: 7.5, text: '🎙️ REAL WHISPER SPEECH-TO-TEXT' },
  { id: 'demo-4', start: 7.5, end: 10.0, text: '🚀 INSTANT IN-BROWSER EXPORT' },
];

function App() {
  const [videoData, setVideoData] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Trimming State
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Aesthetic & Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [activeFilter, setActiveFilter] = useState('none');

  // Real Captions State (Empty by default for user uploads)
  const [captions, setCaptions] = useState([]);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('mrbeast');

  // AI Transcription State
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [transcriptionError, setTranscriptionError] = useState(null);

  // Text to AI Video Modal State
  const [isTextToVideoOpen, setIsTextToVideoOpen] = useState(false);

  // fal.ai Text-to-Video Panel State
  const [isFalPanelOpen, setIsFalPanelOpen] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedBlob, setExportedBlob] = useState(null);

  const videoRef = useRef(null);

  // Handle Video Loading
  const handleVideoLoaded = (data) => {
    setVideoData(data);
    setCurrentTime(0);
    setIsPlaying(false);
    setExportedBlob(null);
    setExportProgress(0);
    setTranscriptionError(null);
    setTranscriptionStatus('');

    // If loading the synthetic demo clip, offer demo transcript for instant playground testing.
    // For ALL uploaded user videos, start with empty captions (no hardcoded captions!).
    if (data.isDemo) {
      setCaptions(DEMO_PLAYGROUND_CAPTIONS);
    } else {
      setCaptions([]);
    }
  };

  // Video Element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration || 10;
      setDuration(dur);
      setTrimStart(0);
      setTrimEnd(dur);
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Loop or stop within trim range
      if (trimEnd > 0 && time >= trimEnd) {
        video.currentTime = trimStart;
        setCurrentTime(trimStart);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      video.currentTime = trimStart;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoData, trimStart, trimEnd]);

  // Play / Pause toggle
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime >= trimEnd || video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.warn);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [trimStart, trimEnd]);

  // Seeking
  const handleSeek = (time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  // Trim adjustments
  const handleTrimChange = (start, end) => {
    setTrimStart(start);
    setTrimEnd(end);
    const video = videoRef.current;
    if (video) {
      if (video.currentTime < start) {
        video.currentTime = start;
        setCurrentTime(start);
      } else if (video.currentTime > end) {
        video.currentTime = end;
        setCurrentTime(end);
      }
    }
  };

  const handleResetTrim = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  // Volume & Speed handlers
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Real Speech-to-Text Transcription Handler
  const handleTranscribeAudio = async () => {
    if (!videoData) return;

    setIsTranscribing(true);
    setTranscriptionError(null);
    setTranscriptionStatus('Extracting audio track from video...');

    try {
      // Step 1: Extract real audio track using Web Audio API
      const { wavBlob } = await extractAudioFromVideo(
        videoData.file || videoData.url,
        (msg) => setTranscriptionStatus(msg)
      );

      // Step 2: Transcribe via Whisper API (Groq Free / OpenAI / Local)
      const segments = await transcribeAudio(
        wavBlob,
        null,
        (msg) => setTranscriptionStatus(msg)
      );

      // Step 3: Populate real captions
      setCaptions(segments);
      setCaptionsEnabled(true);
      setTranscriptionStatus('Transcription complete!');
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscriptionError(err.message || 'Failed to transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Caption Editing & Management Handlers
  const handleUpdateCaption = (id, updates) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCaption = (id) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCaption = (targetTime) => {
    const start = Math.max(0, Math.round(targetTime * 10) / 10);
    const end = Math.min(duration || 9999, Math.round((start + 2.0) * 10) / 10);
    const newCap = {
      id: `cap-user-${Date.now()}`,
      start,
      end,
      text: 'New Caption',
    };
    setCaptions((prev) => [...prev, newCap].sort((a, b) => a.start - b.start));
  };

  // Keyboard shortcuts (Space to Play/Pause, I for Mark In, O for Mark Out)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input, textarea, or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(trimStart, currentTime - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(trimEnd, currentTime + 1));
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleTrimChange(currentTime, trimEnd);
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleTrimChange(trimStart, currentTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, currentTime, trimStart, trimEnd]);

  // Compute active CSS filter string
  const activeFilterObj = COLOR_FILTERS.find((f) => f.id === activeFilter);
  const filterStyle = activeFilterObj ? activeFilterObj.css : 'none';

  // Compute real active caption for current timestamp
  const currentCaption = (() => {
    if (!captionsEnabled || !captions || captions.length === 0) return null;
    const match = captions.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    );
    return match ? match.text : null;
  })();

  // Export Execution
  const handleStartExport = async (resolution, burnSubtitles = false) => {
    if (!videoData) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportedBlob(null);

    // Pause current preview while exporting
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const blob = await exportTrimmedVideo({
        videoSrc: videoData.url,
        trimStart,
        trimEnd,
        filter: filterStyle,
        aspectRatio,
        captionsEnabled: burnSubtitles && captionsEnabled,
        captions: burnSubtitles ? captions : [],
        captionStyle,
        onProgress: (p) => setExportProgress(p),
      });

      setExportedBlob(blob);
      setExportProgress(100);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Could not render video. Check browser permissions or try a shorter clip.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle fal.ai generated video import into timeline
  const handleFalVideoImport = (generatedVideo) => {
    handleVideoLoaded(generatedVideo);
    setAspectRatio('16:9');
    setIsFalPanelOpen(false);
  };

  // Handle Text to Video Generation Success
  const handleVideoGenerated = (generatedVideo, generatedScenes) => {
    handleVideoLoaded(generatedVideo);
    if (generatedScenes && generatedScenes.length > 0) {
      let cumulative = 0;
      const mappedCaptions = generatedScenes.map((s, idx) => {
        const start = cumulative;
        const end = parseFloat((cumulative + s.duration).toFixed(1));
        cumulative = end;
        return {
          id: `cap-scene-${Date.now()}-${idx}`,
          start,
          end,
          text: s.narration || s.title,
        };
      });
      setCaptions(mappedCaptions);
      setCaptionsEnabled(true);
    }
    setAspectRatio('9:16');
    setIsTextToVideoOpen(false);
  };

  return (
    <div className="app-root">
      {/* Top Navigation */}
      <Header
        videoName={videoData?.name}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        onNewVideo={() => {
          setVideoData(null);
          setCaptions([]);
        }}
        onOpenExport={() => {
          setExportedBlob(null);
          setExportProgress(0);
          setIsExportModalOpen(true);
        }}
        onOpenTextToVideo={() => setIsTextToVideoOpen(true)}
        onOpenFalTextToVideo={() => setIsFalPanelOpen(true)}
        hasVideo={Boolean(videoData)}
      />

      {/* Main Studio Viewport */}
      <main className="studio-main">
        {!videoData ? (
          <VideoUploader
            onVideoLoaded={handleVideoLoaded}
            onOpenTextToVideo={() => setIsTextToVideoOpen(true)}
          />
        ) : (
          <div className="editor-workspace">
            {/* Left: Player & Timeline */}
            <div className="stage-area">
              <div className="player-wrapper">
                <VideoPlayer
                  videoSrc={videoData.url}
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  volume={volume}
                  isMuted={isMuted}
                  playbackRate={playbackRate}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  aspectRatio={aspectRatio}
                  filterStyle={filterStyle}
                  captionsEnabled={captionsEnabled}
                  currentCaption={currentCaption}
                  captionStyle={captionStyle}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                  onMuteToggle={handleMuteToggle}
                  onRateChange={handleRateChange}
                  videoRef={videoRef}
                />
              </div>

              {/* Bottom: Interactive Multi-Handle Timeline */}
              <Timeline
                duration={duration}
                currentTime={currentTime}
                trimStart={trimStart}
                trimEnd={trimEnd}
                captions={captions}
                captionsEnabled={captionsEnabled}
                onSeek={handleSeek}
                onTrimChange={handleTrimChange}
                onResetTrim={handleResetTrim}
              />
            </div>

            {/* Right: AI Tools Sidebar */}
            <AIPanel
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              captionsEnabled={captionsEnabled}
              onToggleCaptions={setCaptionsEnabled}
              captionStyle={captionStyle}
              onChangeCaptionStyle={setCaptionStyle}
              onAutoTrimSilences={handleTrimChange}
              duration={duration}
              currentTime={currentTime}
              captions={captions}
              onUpdateCaption={handleUpdateCaption}
              onDeleteCaption={handleDeleteCaption}
              onAddCaption={handleAddCaption}
              onTranscribeAudio={handleTranscribeAudio}
              isTranscribing={isTranscribing}
              transcriptionStatus={transcriptionStatus}
              transcriptionError={transcriptionError}
              onSeek={handleSeek}
            />
          </div>
        )}
      </main>

      {/* Text to AI Video Creation Studio */}
      <TextToVideoModal
        isOpen={isTextToVideoOpen}
        onClose={() => setIsTextToVideoOpen(false)}
        onVideoGenerated={handleVideoGenerated}
      />

      {/* fal.ai Text-to-Video Panel */}
      <FalTextToVideoPanel
        isOpen={isFalPanelOpen}
        onClose={() => setIsFalPanelOpen(false)}
        onImportToTimeline={handleFalVideoImport}
      />

      {/* Export Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        trimStart={trimStart}
        trimEnd={trimEnd}
        aspectRatio={aspectRatio}
        activeFilterName={activeFilterObj?.name || 'Original'}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportedBlob={exportedBlob}
        onStartExport={handleStartExport}
        captionsCount={captions.length}
        captionsEnabled={captionsEnabled}
      />
    </div>
  );
}

export default App;
