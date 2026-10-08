/**
 * audioExtractor.js
 * Extracts the real audio track from an uploaded video file in the browser
 * using the Web Audio API, resamples it to 16kHz mono, and packages it
 * into a standard 16-bit PCM WAV Blob optimal for Whisper and STT models.
 */

/**
 * Extracts audio from a video File or Blob and returns a 16kHz mono WAV Blob.
 * 
 * @param {File|Blob|string} videoSource - The video file, blob, or object URL
 * @param {Function} onProgress - Callback with status message string
 * @returns {Promise<{ wavBlob: Blob, duration: number, sampleRate: number }>}
 */
export async function extractAudioFromVideo(videoSource, onProgress = () => {}) {
  try {
    onProgress('Reading video data into memory...');
    let arrayBuffer;

    if (videoSource instanceof Blob || videoSource instanceof File) {
      arrayBuffer = await videoSource.arrayBuffer();
    } else if (typeof videoSource === 'string') {
      const resp = await fetch(videoSource);
      arrayBuffer = await resp.arrayBuffer();
    } else {
      throw new Error('Unsupported video source format for audio extraction.');
    }

    onProgress('Decoding audio stream with Web Audio API...');
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    const audioCtx = new AudioContextClass();
    let audioBuffer;

    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    } catch (decodeErr) {
      console.warn('Audio decoding failed:', decodeErr);
      throw new Error(
        'Unable to decode audio track. The video may have no audio or uses an unsupported codec.'
      );
    } finally {
      audioCtx.close().catch(() => {});
    }

    if (!audioBuffer || audioBuffer.numberOfChannels === 0 || audioBuffer.length === 0) {
      throw new Error('No audio channels found in this video file.');
    }

    // Check audio duration
    const duration = audioBuffer.duration;

    if (duration <= 0.1) {
      throw new Error('Audio track is too short (under 0.1 seconds).');
    }

    onProgress('Resampling audio to 16kHz mono speech format...');
    const targetSampleRate = 16000;
    const targetLength = Math.ceil(duration * targetSampleRate);

    // Use OfflineAudioContext to downmix and resample cleanly
    const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
    const bufferSource = offlineCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineCtx.destination);
    bufferSource.start(0);

    const resampledBuffer = await offlineCtx.startRendering();
    const monoChannelData = resampledBuffer.getChannelData(0);

    // Verify if there is non-zero audio data
    let isSilent = true;
    for (let i = 0; i < monoChannelData.length; i += 100) {
      if (Math.abs(monoChannelData[i]) > 0.001) {
        isSilent = false;
        break;
      }
    }

    if (isSilent) {
      console.warn('Audio channel appears to be completely silent.');
    }

    onProgress('Encoding 16-bit PCM WAV file...');
    const wavBlob = encodeWAV(monoChannelData, targetSampleRate);

    return {
      wavBlob,
      duration,
      sampleRate: targetSampleRate,
    };
  } catch (err) {
    console.error('Audio extraction failed:', err);
    throw err;
  }
}

/**
 * Encodes Float32Array PCM samples into a standard 16-bit mono RIFF WAV Blob.
 * 
 * @param {Float32Array} samples 
 * @param {number} sampleRate 
 * @returns {Blob}
 */
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Helper to write string to DataView
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample between -1 and 1
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert to 16-bit signed integer (-32768 to 32767)
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
