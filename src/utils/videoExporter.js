/**
 * Exports a trimmed video segment using HTML5 Canvas and MediaRecorder.
 * Renders any applied CSS filter and synchronized captions directly into the exported video frames.
 *
 * @param {Object} options
 * @param {string} options.videoSrc - URL or ObjectURL of the source video
 * @param {number} options.trimStart - Start time in seconds
 * @param {number} options.trimEnd - End time in seconds
 * @param {string} options.filter - CSS filter string (e.g., 'contrast(1.2) saturate(1.3)')
 * @param {string} options.aspectRatio - '16:9' | '9:16' | '1:1'
 * @param {boolean} [options.captionsEnabled] - Whether to burn captions into export
 * @param {Array} [options.captions] - Array of caption objects { start, end, text }
 * @param {string} [options.captionStyle] - Caption visual style
 * @param {Function} options.onProgress - Callback with progress percentage (0 - 100)
 * @returns {Promise<Blob>}
 */
export async function exportTrimmedVideo({
  videoSrc,
  trimStart,
  trimEnd,
  filter = 'none',
  aspectRatio = '16:9',
  captionsEnabled = false,
  captions = [],
  captionStyle = 'mrbeast',
  onProgress = () => {},
}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = false;

    video.onloadedmetadata = () => {
      // Determine export dimensions
      let width = video.videoWidth || 1280;
      let height = video.videoHeight || 720;

      if (aspectRatio === '9:16') {
        height = 1280;
        width = 720;
      } else if (aspectRatio === '1:1') {
        width = 720;
        height = 720;
      } else {
        // default 16:9
        width = 1280;
        height = 720;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const duration = Math.max(0.1, trimEnd - trimStart);
      video.currentTime = trimStart;

      video.onseeked = () => {
        try {
          // Prepare canvas stream
          const canvasStream = canvas.captureStream(30);

          // Attempt to capture audio stream from video if supported
          let combinedStream = canvasStream;
          try {
            if (typeof video.captureStream === 'function') {
              const videoAudioStream = video.captureStream();
              const audioTracks = videoAudioStream.getAudioTracks();
              if (audioTracks.length > 0) {
                audioTracks.forEach((track) => canvasStream.addTrack(track));
              }
            }
          } catch (e) {
            console.warn('Could not capture audio track from video stream:', e);
          }

          // Pick supported MIME type
          let mimeType = 'video/webm;codecs=vp9';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }

          const recorder = new MediaRecorder(
            combinedStream,
            mimeType ? { mimeType } : undefined
          );
          const chunks = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            video.pause();
            const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
            onProgress(100);
            resolve(blob);
          };

          recorder.onerror = (err) => {
            video.pause();
            reject(err);
          };

          recorder.start(100);
          video.play().catch(reject);

          // Draw loop
          let animationFrameId;
          const drawFrame = () => {
            if (video.currentTime >= trimEnd || video.paused || video.ended) {
              cancelAnimationFrame(animationFrameId);
              if (recorder.state === 'recording') {
                recorder.stop();
              }
              return;
            }

            // Calculate progress percentage
            const elapsed = Math.max(0, video.currentTime - trimStart);
            const progress = Math.min(99, Math.round((elapsed / duration) * 100));
            onProgress(progress);

            // Draw background
            ctx.save();
            ctx.fillStyle = '#0f1117';
            ctx.fillRect(0, 0, width, height);

            if (filter && filter !== 'none') {
              ctx.filter = filter;
            }

            // Calculate "cover" fit
            const hRatio = width / video.videoWidth;
            const vRatio = height / video.videoHeight;
            const ratio = Math.max(hRatio, vRatio);
            const centerShiftX = (width - video.videoWidth * ratio) / 2;
            const centerShiftY = (height - video.videoHeight * ratio) / 2;

            ctx.drawImage(
              video,
              0,
              0,
              video.videoWidth,
              video.videoHeight,
              centerShiftX,
              centerShiftY,
              video.videoWidth * ratio,
              video.videoHeight * ratio
            );
            ctx.restore();

            // Render Synchronized Captions if enabled
            if (captionsEnabled && captions && captions.length > 0) {
              const currentCap = captions.find(
                (c) => video.currentTime >= c.start && video.currentTime <= c.end
              );

              if (currentCap && currentCap.text && currentCap.text.trim()) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const fontSize = Math.max(20, Math.round(height * 0.045));
                ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;

                const textY = height * 0.85;
                const textX = width / 2;
                const upperText = currentCap.text.trim().toUpperCase();

                if (captionStyle === 'mrbeast') {
                  ctx.lineJoin = 'round';
                  ctx.lineWidth = Math.max(4, fontSize * 0.2);
                  ctx.strokeStyle = '#000000';
                  ctx.strokeText(upperText, textX, textY);
                  ctx.fillStyle = '#fde047';
                  ctx.fillText(upperText, textX, textY);
                } else if (captionStyle === 'neon') {
                  ctx.shadowColor = '#06b6d4';
                  ctx.shadowBlur = 18;
                  ctx.fillStyle = '#38bdf8';
                  ctx.fillText(upperText, textX, textY);
                } else if (captionStyle === 'boxed') {
                  const textMetrics = ctx.measureText(currentCap.text);
                  const padding = 16;
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                  if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(
                      textX - textMetrics.width / 2 - padding,
                      textY - fontSize / 2 - 8,
                      textMetrics.width + padding * 2,
                      fontSize + 16,
                      8
                    );
                    ctx.fill();
                  } else {
                    ctx.fillRect(
                      textX - textMetrics.width / 2 - padding,
                      textY - fontSize / 2 - 8,
                      textMetrics.width + padding * 2,
                      fontSize + 16
                    );
                  }
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(currentCap.text, textX, textY);
                } else {
                  // Clean White
                  ctx.shadowColor = 'rgba(0,0,0,0.9)';
                  ctx.shadowBlur = 10;
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(currentCap.text, textX, textY);
                }
                ctx.restore();
              }
            }

            animationFrameId = requestAnimationFrame(drawFrame);
          };

          animationFrameId = requestAnimationFrame(drawFrame);
        } catch (err) {
          reject(err);
        }
      };
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for export.'));
    };
  });
}
