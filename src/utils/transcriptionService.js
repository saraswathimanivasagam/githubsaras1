/**
 * transcriptionService.js
 * Handles real speech-to-text transcription via Whisper API providers:
 * - Groq Whisper (Free tier with whisper-large-v3-turbo)
 * - OpenAI Whisper (whisper-1)
 * - Custom / Local Whisper Server (Faster-Whisper, Whisper.cpp, LocalAI)
 */

const STORAGE_KEY = 'clipai_transcription_config';

export const DEFAULT_CONFIG = {
  provider: 'groq', // 'groq' | 'openai' | 'custom'
  apiKey: '',
  customEndpoint: 'http://localhost:8000/v1/audio/transcriptions',
  model: 'whisper-large-v3-turbo',
  language: 'en',
};

/**
 * Loads configuration from localStorage
 */
export function getTranscriptionConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Saves configuration to localStorage
 */
export function saveTranscriptionConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save transcription config to localStorage:', e);
  }
}

/**
 * Transcribes audio WAV blob into timed caption segments using Whisper API.
 * 
 * @param {Blob} wavBlob - The 16kHz mono WAV audio blob
 * @param {Object} [overrideConfig] - Optional config overrides
 * @param {Function} [onStatus] - Status update callback
 * @returns {Promise<Array<{ id: string, start: number, end: number, text: string }>>}
 */
export async function transcribeAudio(wavBlob, overrideConfig = null, onStatus = () => {}) {
  const config = overrideConfig || getTranscriptionConfig();
  const { provider, apiKey, customEndpoint, language } = config;

  // Validate API key requirement
  if (provider !== 'custom' && (!apiKey || !apiKey.trim())) {
    const providerName = provider === 'groq' ? 'Groq (Free)' : 'OpenAI';
    throw new Error(
      `An API key is required for ${providerName} transcription. Please open Captions Setup and enter your key.`
    );
  }

  onStatus('Connecting to Whisper AI service...');

  // Determine endpoint URL and model
  let url = '';
  let modelName = 'whisper-large-v3-turbo';

  if (provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/audio/transcriptions';
    modelName = 'whisper-large-v3-turbo';
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/audio/transcriptions';
    modelName = 'whisper-1';
  } else if (provider === 'custom') {
    url = customEndpoint || 'http://localhost:8000/v1/audio/transcriptions';
    modelName = config.model || 'whisper-1';
  }

  // Prepare FormData
  const formData = new FormData();
  const audioFile = new File([wavBlob], 'audio.wav', { type: 'audio/wav' });
  formData.append('file', audioFile);
  formData.append('model', modelName);
  formData.append('response_format', 'verbose_json');
  formData.append('temperature', '0');

  if (language && language !== 'auto') {
    formData.append('language', language);
  }

  // Request Headers
  const headers = {};
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  onStatus(`Uploading audio and transcribing with ${modelName}...`);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (fetchErr) {
    console.error('Transcription fetch error:', fetchErr);
    if (provider === 'custom') {
      throw new Error(
        `Unable to reach local Whisper server at "${url}". Ensure the server is running with CORS enabled.`
      );
    }
    throw new Error(
      `Network connection failed while contacting ${provider} API. Check your internet connection.`
    );
  }

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errJson = await response.json();
      errorDetails = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetails = response.statusText;
    }

    if (response.status === 401) {
      throw new Error(`Authentication failed (401): Invalid API key for ${provider}. Please check your key.`);
    }
    if (response.status === 429) {
      throw new Error(`Rate limit or quota exceeded (429): ${errorDetails || 'Please check your API account plan.'}`);
    }
    if (response.status === 413) {
      throw new Error('Audio file exceeds the maximum allowed upload size (25MB).');
    }

    throw new Error(`Transcription request failed (${response.status}): ${errorDetails}`);
  }

  onStatus('Processing transcription timestamps...');
  const data = await response.json();

  // If segments are returned (from verbose_json)
  if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
    const parsedSegments = data.segments
      .map((seg, idx) => ({
        id: `cap-${Date.now()}-${idx}`,
        start: Math.max(0, parseFloat(Number(seg.start).toFixed(2))),
        end: Math.max(0.1, parseFloat(Number(seg.end).toFixed(2))),
        text: seg.text.trim(),
      }))
      .filter((seg) => seg.text.length > 0);

    if (parsedSegments.length === 0) {
      throw new Error('No speech was detected in this video audio.');
    }

    return parsedSegments;
  }

  // Fallback: If only full text was returned without granular segments
  if (data.text && data.text.trim()) {
    const fullText = data.text.trim();
    // Split sentences into readable phrases
    const sentences = fullText
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      throw new Error('No speech text was detected.');
    }

    // Estimate equal time ranges based on audio duration or fallback
    const totalDuration = data.duration || 10;
    const timePerChunk = totalDuration / sentences.length;

    return sentences.map((text, idx) => ({
      id: `cap-${Date.now()}-${idx}`,
      start: parseFloat((idx * timePerChunk).toFixed(2)),
      end: parseFloat(((idx + 1) * timePerChunk).toFixed(2)),
      text,
    }));
  }

  throw new Error('No speech was detected in this video audio.');
}

/**
 * Converts caption array to SubRip (.SRT) subtitle file format
 * @param {Array<{ start: number, end: number, text: string }>} captions
 * @returns {string}
 */
export function formatSRT(captions) {
  const formatSrtTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
      .toString()
      .padStart(3, '0')}`;
  };

  return captions
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

/**
 * Converts caption array to WebVTT (.VTT) subtitle file format
 * @param {Array<{ start: number, end: number, text: string }>} captions
 * @returns {string}
 */
export function formatVTT(captions) {
  const formatVttTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(3, '0')}`;
  };

  const body = captions
    .map((c, i) => `${i + 1}\n${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n`)
    .join('\n');

  return `WEBVTT\n\n${body}`;
}
