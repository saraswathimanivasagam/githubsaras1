/**
 * Generates a colorful synthetic demo video clip entirely in the browser
 * using HTML5 Canvas and MediaRecorder.
 * No external network requests needed; 100% reliable and CORS-free.
 *
 * @returns {Promise<{ url: string, name: string, duration: number }>}
 */
export function generateSampleVideo() {
  return new Promise((resolve, reject) => {
    try {
      const width = 1280;
      const height = 720;
      const durationSeconds = 10;
      const fps = 30;
      const totalFrames = durationSeconds * fps;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(fps);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        resolve({
          url,
          name: 'Demo_Nature_Cyberpunk.webm',
          duration: durationSeconds,
        });
      };

      recorder.start();

      let frame = 0;
      function renderNextFrame() {
        const t = frame / fps;
        const progress = frame / totalFrames;

        // Dynamic gradient background
        const grad = ctx.createLinearGradient(
          0,
          0,
          width * Math.cos(t * 0.5),
          height * Math.sin(t * 0.5)
        );
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#4338ca');
        grad.addColorStop(1, '#a855f7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Animated glowing rings
        for (let i = 0; i < 4; i++) {
          const radius = 100 + i * 60 + Math.sin(t * 2 + i) * 30;
          ctx.beginPath();
          ctx.arc(
            width / 2 + Math.cos(t + i) * 80,
            height / 2 + Math.sin(t * 1.5 + i) * 50,
            Math.max(10, radius),
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = `hsla(${(t * 50 + i * 60) % 360}, 85%, 65%, ${0.4 - i * 0.08})`;
          ctx.lineWidth = 4 + i * 2;
          ctx.stroke();
        }

        // Floating particles
        for (let j = 0; j < 25; j++) {
          const px = (Math.sin(j * 99 + t * 0.8) * 0.5 + 0.5) * width;
          const py = (Math.cos(j * 43 + t * 1.2) * 0.5 + 0.5) * height;
          const size = 3 + (j % 5);
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (j % 5) * 0.1})`;
          ctx.fill();
        }

        // Center card
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.roundRect(width / 2 - 320, height / 2 - 130, 640, 260, 24);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.stroke();

        // Title text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ AI ClipStudio Demo', width / 2, height / 2 - 40);

        // Subtitle text
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '22px system-ui, sans-serif';
        ctx.fillText('Interactive Timeline & Trim Playground', width / 2, height / 2 + 10);

        // Timecode display
        const mins = Math.floor(t / 60).toString().padStart(2, '0');
        const secs = Math.floor(t % 60).toString().padStart(2, '0');
        const tenths = Math.floor((t % 1) * 10);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 32px monospace';
        ctx.fillText(`00:${mins}:${secs}.${tenths}`, width / 2, height / 2 + 75);

        // Progress bar at the bottom
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, height - 10, width, 10);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(0, height - 10, width * progress, 10);

        frame++;
        if (frame < totalFrames) {
          // Render faster than real-time to generate in less than a second!
          renderNextFrame();
        } else {
          recorder.stop();
        }
      }

      renderNextFrame();
    } catch (err) {
      reject(err);
    }
  });
}
