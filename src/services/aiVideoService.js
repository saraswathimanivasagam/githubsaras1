/**
 * aiVideoService.js
 * Clean provider abstraction for Text to AI Video generation.
 * Supports:
 * - Runway Gen-3 Alpha API
 * - Luma Dream Machine API
 * - Fal.ai / Replicate video models
 * - Custom GPU / Webhook API
 *
 * Enforces strict provider validation: If no provider is configured,
 * it alerts the user with a clear "Provider not configured" state
 * instead of faking video URLs or generation results.
 */

const STORAGE_KEY = 'clipai_video_provider_config';

export const VIDEO_PROVIDERS = [
  {
    id: 'none',
    name: 'Not Configured',
    badge: 'Setup Required',
    description: 'No external video generation provider connected.',
  },
  {
    id: 'runway',
    name: 'Runway Gen-3 Alpha',
    badge: 'API Key',
    description: 'High-fidelity cinematic video generation via Runway ML API.',
    website: 'https://runwayml.com/',
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    badge: 'API Key',
    description: 'Ultra-realistic physics & human motion generation via Luma API.',
    website: 'https://lumalabs.ai/dream-machine/api',
  },
  {
    id: 'fal',
    name: 'Fal.ai (Kling / Minimax)',
    badge: 'Fast API',
    description: 'Fast cloud inference for modern text-to-video AI models.',
    website: 'https://fal.ai/models',
  },
  {
    id: 'custom',
    name: 'Custom Server / Webhook',
    badge: 'Self-Hosted',
    description: 'Connect your own ComfyUI, Diffusers server, or backend GPU webhook.',
  },
];

export const DEFAULT_PROVIDER_CONFIG = {
  provider: 'none',
  apiKey: '',
  customEndpoint: '',
  model: 'gen3a_turbo',
};

/**
 * Loads the active video provider configuration from localStorage
 */
export function getVideoProviderConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROVIDER_CONFIG };
    return { ...DEFAULT_PROVIDER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROVIDER_CONFIG };
  }
}

/**
 * Saves video provider configuration to localStorage
 */
export function saveVideoProviderConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save video provider config to localStorage:', e);
  }
}

/**
 * Checks if an AI video provider is currently configured with valid credentials
 */
export function isProviderConfigured(config = null) {
  const cfg = config || getVideoProviderConfig();
  if (!cfg.provider || cfg.provider === 'none') {
    return false;
  }
  if (cfg.provider === 'custom') {
    return Boolean(cfg.customEndpoint && cfg.customEndpoint.trim().length > 0);
  }
  return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0);
}

/**
 * Requests video generation from the configured AI provider.
 * Does NOT return fake/hardcoded URLs.
 * 
 * @param {Object} params
 * @param {string} params.prompt - Original script
 * @param {Array} params.scenes - 3-4 structured scenes from scenePlanner
 * @param {Object} params.options - { duration, aspectRatio, visualStyle, voiceLanguage, voice }
 * @param {Function} [params.onProgress] - Progress callback with status text and percentage
 * @returns {Promise<{ url: string, name: string, duration: number, file?: File }>}
 */
export async function generateAIVideo({
  prompt,
  scenes,
  options = {},
  onProgress = () => {},
}) {
  const config = getVideoProviderConfig();

  // Strict check: if no provider is configured, do not pretend or fake video generation
  if (!isProviderConfigured(config)) {
    const error = new Error(
      'AI Video Provider is not configured. Please open Provider Settings to add your Runway, Luma, Fal.ai API key or custom endpoint URL.'
    );
    error.code = 'PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  const { provider, apiKey, customEndpoint, model } = config;

  onProgress({
    status: `Connecting to ${getProviderDisplayName(provider)} service...`,
    progress: 10,
  });

  // Prepare standard payload with full storyboard
  const payload = {
    prompt,
    scenes: scenes.map((s) => ({
      scene: s.sceneNumber,
      title: s.title,
      visualPrompt: s.visualPrompt,
      narration: s.narration,
      duration: s.duration,
      cameraShot: s.cameraShot,
    })),
    options: {
      duration: options.duration || 15,
      aspectRatio: options.aspectRatio || '9:16',
      visualStyle: options.visualStyle || 'Realistic UGC',
      voiceLanguage: options.voiceLanguage || 'ta',
      voice: options.voice || 'female-warm',
      model,
    },
  };

  try {
    let endpointUrl = '';
    const headers = {
      'Content-Type': 'application/json',
    };

    if (provider === 'runway') {
      endpointUrl = 'https://api.dev.runwayml.com/v1/tasks';
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      headers['X-Runway-Version'] = '2024-09-13';
    } else if (provider === 'luma') {
      endpointUrl = 'https://api.lumalabs.ai/dream-machine/v1/generations';
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    } else if (provider === 'fal') {
      endpointUrl = 'https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video';
      headers['Authorization'] = `Key ${apiKey.trim()}`;
    } else if (provider === 'custom') {
      endpointUrl = customEndpoint.trim();
      if (apiKey && apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
    }

    onProgress({
      status: `Dispatching storyboard (${scenes.length} scenes) to ${getProviderDisplayName(provider)}...`,
      progress: 30,
    });

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errDetails = '';
      try {
        const errJson = await response.json();
        errDetails = errJson.message || errJson.error || JSON.stringify(errJson);
      } catch {
        errDetails = response.statusText;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed: Invalid API key for ${getProviderDisplayName(provider)}.`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded for ${getProviderDisplayName(provider)}. Please wait or check your quota.`);
      }

      throw new Error(`Provider API error (${response.status}): ${errDetails}`);
    }

    onProgress({
      status: 'Rendering AI scenes and combining video stream...',
      progress: 75,
    });

    const data = await response.json();

    // Extract video URL or asset from response
    const videoUrl =
      data.videoUrl ||
      data.output?.url ||
      data.output?.video ||
      data.assets?.video ||
      (Array.isArray(data.outputs) && data.outputs[0]?.url) ||
      data.url;

    if (!videoUrl) {
      // If task was queued asynchronously by provider
      if (data.id || data.taskId) {
        throw new Error(
          `Task queued by provider (ID: ${data.id || data.taskId}). Polling is required; verify task on your provider dashboard.`
        );
      }
      throw new Error('Provider response did not contain a valid video URL.');
    }

    onProgress({
      status: 'Video generation complete! Preparing studio...',
      progress: 100,
    });

    return {
      url: videoUrl,
      name: `AI_${options.visualStyle?.replace(/\s+/g, '_')}_${options.duration || 15}s.mp4`,
      duration: options.duration || 15,
      isGenerated: true,
    };
  } catch (err) {
    console.error('Video generation failed:', err);
    throw err;
  }
}

/**
 * Helper to display human-readable provider name
 */
export function getProviderDisplayName(providerId) {
  const p = VIDEO_PROVIDERS.find((item) => item.id === providerId);
  return p ? p.name : providerId;
}
