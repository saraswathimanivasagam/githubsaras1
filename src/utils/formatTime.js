/**
 * Formats seconds into MM:SS or MM:SS.ms string
 * @param {number} seconds
 * @param {boolean} includeMs
 * @returns {string}
 */
export function formatTime(seconds, includeMs = false) {
  if (isNaN(seconds) || seconds < 0) return includeMs ? '00:00.0' : '00:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');

  if (includeMs) {
    const tenths = Math.floor((seconds % 1) * 10);
    return `${paddedMins}:${paddedSecs}.${tenths}`;
  }

  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Clamps a value between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
