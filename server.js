/**
 * server.js
 * Lightweight Express proxy server.
 * - Reads FAL_KEY from server-side environment variables (never exposed to the client).
 * - Exposes /api/fal/* endpoints that the Vite dev-server proxies to.
 *
 * Start: node server.js
 * Production: set FAL_KEY=<your_key> before starting.
 */

import express from 'express';
import { createServer } from 'http';

const app = express();
app.use(express.json());

// ─── CORS for local dev ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const configured = Boolean(process.env.FAL_KEY);
  res.json({ ok: true, falConfigured: configured });
});

// ─── Text-to-Video: submit generation job ────────────────────────────────────
/**
 * POST /api/fal/generate-video
 * Body: { prompt: string, aspectRatio?: "16:9"|"9:16"|"1:1", duration?: 5|10 }
 *
 * Returns: { requestId: string } immediately (async queue pattern).
 * The client polls /api/fal/status/:requestId to get the result.
 */
app.post('/api/fal/generate-video', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY;

  if (!FAL_KEY) {
    return res.status(503).json({
      error:
        'FAL_KEY is not configured on the server. Set the FAL_KEY environment variable and restart the server.',
      code: 'FAL_KEY_MISSING',
    });
  }

  const { prompt, aspectRatio = '16:9', duration = 5 } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A non-empty prompt is required.', code: 'MISSING_PROMPT' });
  }

  // Map duration to fal-supported values (Kling supports 5 or 10)
  const safeSeconds = [5, 10].includes(Number(duration)) ? Number(duration) : 5;

  try {
    // Submit to fal.ai Kling v1.6 Standard text-to-video queue
    const falRes = await fetch(
      'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video',
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
          duration: String(safeSeconds),
        }),
      }
    );

    const data = await falRes.json();

    if (!falRes.ok) {
      const msg = data?.detail || data?.message || data?.error || `fal.ai error ${falRes.status}`;
      return res.status(falRes.status).json({ error: msg, code: 'FAL_API_ERROR' });
    }

    // fal queue returns { request_id, status, response_url, status_url, cancel_url }
    return res.json({
      requestId: data.request_id,
      statusUrl: data.status_url,
    });
  } catch (err) {
    console.error('[fal proxy] generate-video error:', err);
    return res.status(500).json({ error: err.message || 'Internal proxy error', code: 'PROXY_ERROR' });
  }
});

// ─── Text-to-Video: poll job status ───────────────────────────────────────────
/**
 * GET /api/fal/status/:requestId
 * Returns:
 *   { status: "IN_QUEUE"|"IN_PROGRESS"|"COMPLETED"|"FAILED", videoUrl?, logs? }
 */
app.get('/api/fal/status/:requestId', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(503).json({ error: 'FAL_KEY not configured.', code: 'FAL_KEY_MISSING' });
  }

  const { requestId } = req.params;
  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required.', code: 'MISSING_REQUEST_ID' });
  }

  try {
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${requestId}/status`,
      {
        headers: { Authorization: `Key ${FAL_KEY}` },
      }
    );

    const data = await statusRes.json();

    if (!statusRes.ok) {
      const msg =
        data?.detail || data?.message || data?.error || `fal.ai status error ${statusRes.status}`;
      return res.status(statusRes.ok ? 200 : statusRes.status).json({
        error: msg,
        code: 'FAL_STATUS_ERROR',
      });
    }

    // Statuses: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
    const status = data.status || 'UNKNOWN';

    if (status === 'COMPLETED') {
      // Fetch the result payload
      const resultRes = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${requestId}`,
        { headers: { Authorization: `Key ${FAL_KEY}` } }
      );
      const resultData = await resultRes.json();

      // fal Kling returns { video: { url, content_type, file_name, file_size } }
      const videoUrl =
        resultData?.video?.url ||
        resultData?.output?.video?.url ||
        resultData?.url ||
        (Array.isArray(resultData?.videos) && resultData.videos[0]?.url);

      if (!videoUrl) {
        return res.status(200).json({
          status: 'FAILED',
          error: 'Generation completed but no video URL was returned by fal.ai.',
        });
      }

      return res.json({ status: 'COMPLETED', videoUrl });
    }

    // IN_QUEUE or IN_PROGRESS — return progress info if available
    const queuePosition = data.queue_position ?? null;
    const logs = Array.isArray(data.logs) ? data.logs : [];

    return res.json({ status, queuePosition, logs });
  } catch (err) {
    console.error('[fal proxy] status error:', err);
    return res.status(500).json({ error: err.message || 'Internal proxy error', code: 'PROXY_ERROR' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[fal proxy] running on http://localhost:${PORT}`);
  if (!process.env.FAL_KEY) {
    console.warn('[fal proxy] WARNING: FAL_KEY is not set. /api/fal/* endpoints will return 503.');
  } else {
    console.log('[fal proxy] FAL_KEY is configured. ✓');
  }
});
