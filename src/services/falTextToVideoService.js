/**
 * falTextToVideoService.js
 *
 * Frontend service for fal.ai Text-to-Video generation.
 * ALL API calls go through /api/fal/* (Vite dev proxy → Express server).
 * FAL_KEY is NEVER present in this file or any other frontend file.
 */

const POLL_INTERVAL_MS = 4000; // poll every 4 seconds
const MAX_POLL_ATTEMPTS = 150;  // ~10 minutes max

/**
 * Check if the server-side fal proxy is up and configured.
 * @returns {Promise<{ ok: boolean, falConfigured: boolean, error?: string }>}
 */
export async function checkFalServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { ok: false, falConfigured: false, error: `Server returned ${res.status}` };
    const data = await res.json();
    return { ok: true, falConfigured: Boolean(data.falConfigured) };
  } catch (err) {
    return { ok: false, falConfigured: false, error: err.message };
  }
}

/**
 * Generate a video using fal.ai Kling via the server-side proxy.
 *
 * @param {Object} params
 * @param {string} params.prompt        - Text description of the video
 * @param {string} [params.aspectRatio] - "16:9" | "9:16" | "1:1"
 * @param {number} [params.duration]    - 5 | 10 (seconds)
 * @param {Function} [params.onProgress] - Called with { status, progress (0-100), log? }
 * @param {AbortSignal} [params.signal] - Optional abort signal
 *
 * @returns {Promise<{ videoUrl: string, requestId: string }>}
 */
export async function generateFalVideo({
  prompt,
  aspectRatio = '16:9',
  duration = 5,
  onProgress = () => {},
  signal,
}) {
  // ── Step 1: Submit the job ──────────────────────────────────────────────────
  onProgress({ status: 'Submitting to fal.ai Kling...', progress: 5 });

  const submitRes = await fetch('/api/fal/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, duration }),
    signal,
  });

  const submitData = await submitRes.json();

  if (!submitRes.ok) {
    const code = submitData?.code || 'UNKNOWN';
    if (code === 'FAL_KEY_MISSING') {
      throw Object.assign(
        new Error(
          'fal.ai is not configured on the server. Please set the FAL_KEY environment variable and restart `npm run server`.'
        ),
        { code }
      );
    }
    throw new Error(submitData?.error || `Failed to submit job (HTTP ${submitRes.status})`);
  }

  const { requestId } = submitData;
  if (!requestId) {
    throw new Error('Server did not return a requestId. Check the proxy server logs.');
  }

  onProgress({ status: 'Job queued — waiting for fal.ai...', progress: 10 });

  // ── Step 2: Poll for completion ──────────────────────────────────────────────
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    await sleep(POLL_INTERVAL_MS);
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    const pollRes = await fetch(`/api/fal/status/${encodeURIComponent(requestId)}`, { signal });
    const pollData = await pollRes.json();

    if (!pollRes.ok) {
      // Non-fatal: log and keep polling unless it's a hard error
      console.warn(`[falVideoService] poll attempt ${attempt + 1} error:`, pollData);
      continue;
    }

    const { status, videoUrl, queuePosition, logs, error: pollError } = pollData;

    if (status === 'COMPLETED' && videoUrl) {
      onProgress({ status: 'Generation complete!', progress: 100 });
      return { videoUrl, requestId };
    }

    if (status === 'FAILED') {
      throw new Error(pollError || 'fal.ai reported the job failed. Check the fal.ai dashboard.');
    }

    // Update progress while waiting
    const baseProgress = 10;
    const maxProgress = 90;
    const pollProgress = Math.min(
      maxProgress,
      baseProgress + Math.round((attempt / MAX_POLL_ATTEMPTS) * (maxProgress - baseProgress))
    );

    let statusText = 'Processing on fal.ai...';
    if (status === 'IN_QUEUE') {
      statusText =
        queuePosition != null
          ? `In queue — position ${queuePosition}...`
          : 'In queue — waiting for a worker...';
    } else if (status === 'IN_PROGRESS') {
      const lastLog = logs?.[logs.length - 1]?.message;
      statusText = lastLog ? `In progress: ${lastLog}` : 'Generating frames...';
    }

    onProgress({ status: statusText, progress: pollProgress, log: logs?.[logs.length - 1]?.message });
  }

  throw new Error('Generation timed out after 10 minutes. The job may still be running on fal.ai — check your dashboard.');
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
