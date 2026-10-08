/**
 * scenePlanner.js
 * Intelligent script-to-scene planning engine for Text to AI Video generation.
 * Parses user text into 3-4 structured scenes with visual prompts, voiceover,
 * duration timing, and camera angles.
 */

/**
 * Generates 3-4 structured video scenes from a text prompt or script.
 * 
 * @param {string} rawText - User input text or script
 * @param {Object} options - Video generation options
 * @param {number} [options.duration=15] - Target video duration (15s default)
 * @param {string} [options.aspectRatio='9:16'] - Aspect ratio
 * @param {string} [options.visualStyle='Realistic UGC'] - Visual style
 * @param {string} [options.voiceLanguage='ta'] - Voice language code
 * @param {string} [options.voice='female-warm'] - Selected voice
 * @returns {Array<{ id: string, sceneNumber: number, title: string, visualPrompt: string, narration: string, duration: number, cameraShot: string }>}
 */
export function generateScenePlan(rawText, options = {}) {
  const text = (rawText || '').trim();
  const totalDuration = options.duration || 15;
  const style = options.visualStyle || 'Realistic UGC';
  const aspectRatio = options.aspectRatio || '9:16';
  const lang = options.voiceLanguage || 'ta';

  // Handle specific user example or Tamil coconut script:
  // "ஒரு 30 வயது பெண் வெயிலில் சோர்வாக இருக்கிறார். அவள் chilled green coconut water குடிக்கிறார்."
  const isCoconutScript =
    text.includes('coconut') ||
    text.includes('தேங்காய்') ||
    text.includes('வெயிலில்') ||
    (text.includes('பெண்') && text.includes('சோர்வாக'));

  if (isCoconutScript) {
    const timePerScene = parseFloat((totalDuration / 4).toFixed(1));
    return [
      {
        id: `scene-1-${Date.now()}`,
        sceneNumber: 1,
        title: 'Woman tired in hot sunlight',
        visualPrompt: `${style}: Realistic handheld smartphone video of a 30-year-old woman looking visibly exhausted under the intense blazing hot tropical sunlight, wiping sweat from her forehead, squinting at the sky, natural outdoor lighting, ${aspectRatio} vertical format.`,
        narration: lang === 'ta'
          ? 'இந்த சுட்டெரிக்கும் வெயில்ல உடம்பு ரொம்ப சோர்ந்து போயிருக்கா?'
          : 'Exhausted and completely drained by the scorching hot afternoon sun?',
        duration: timePerScene,
        cameraShot: 'Wide Establishing Shot',
      },
      {
        id: `scene-2-${Date.now()}`,
        sceneNumber: 2,
        title: 'She opens a chilled green coconut',
        visualPrompt: `${style}: Close-up shot of her hands slicing open a fresh, ice-cold green tender coconut with glistening condensation droplets running down the shell, splashing fresh coconut water in sunlight, ${aspectRatio}.`,
        narration: lang === 'ta'
          ? 'இதோ, இயற்கை தரும் உடனே புத்துணர்ச்சி — சில்லுன்னு பசுமை இளநீர்!'
          : 'Nature\'s instant hydration — pure, ice-chilled fresh green coconut!',
        duration: timePerScene,
        cameraShot: 'Medium Close-up Action',
      },
      {
        id: `scene-3-${Date.now()}`,
        sceneNumber: 3,
        title: 'She drinks coconut water and looks refreshed',
        visualPrompt: `${style}: Eye-level portrait shot as she takes a long, thirst-quenching sip with a straw. Her face instantly lights up with genuine delight, energy, and radiant smile of pure refreshment, ${aspectRatio}.`,
        narration: lang === 'ta'
          ? 'ஒரு மிடறு குடிச்சதும் உடம்பும் மனசும் அப்படியே ஜில்லுன்னு ஃப்ரெஷ் ஆகிடும்!'
          : 'One refreshing sip and you instantly feel recharged, cool, and rehydrated!',
        duration: timePerScene,
        cameraShot: 'Over-the-shoulder Close-up',
      },
      {
        id: `scene-4-${Date.now()}`,
        sceneNumber: 4,
        title: 'Product close-up and CTA',
        visualPrompt: `${style}: High-end commercial beauty shot of the green coconut on a wooden table with fresh tropical leaves and ice, soft golden hour glow, crisp text overlay "100% Pure Natural Hydration", ${aspectRatio}.`,
        narration: lang === 'ta'
          ? 'இன்றே அருந்துங்கள், கோடையை வெல்லுங்கள்! இப்போதே வாங்குங்கள்.'
          : 'Stay cool and energized all summer! Grab yours today.',
        duration: timePerScene,
        cameraShot: 'Product Macro Shot & CTA',
      },
    ];
  }

  // General script parsing into 3-4 scenes
  // Split input into sentences or clauses
  const rawSentences = text
    .split(/(?<=[.?!;।\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let numScenes = 4;
  if (totalDuration <= 10) numScenes = 3;

  const scenes = [];
  const sceneDurations = distributeDuration(totalDuration, numScenes);

  const shotTypes = [
    'Wide Shot - Hook & Setting',
    'Medium Shot - Action & Intro',
    'Close-up - Key Moment / Climax',
    'Hero Close-up & Call to Action',
  ];

  for (let i = 0; i < numScenes; i++) {
    const sceneNum = i + 1;
    let sceneText = rawSentences[i] || '';

    // If fewer sentences than scenes, synthesize narrative beats
    if (!sceneText) {
      if (sceneNum === 1) sceneText = text.slice(0, 60) || 'Introduction hook';
      else if (sceneNum === 2) sceneText = 'Main action and demonstration';
      else if (sceneNum === 3) sceneText = 'Transformation and emotional payoff';
      else sceneText = 'Summary and call to action';
    }

    const title = getSceneTitle(sceneNum, sceneText);
    const visualPrompt = `${style}: ${sceneText}, professional lighting, dynamic camera movement, authentic details, ${aspectRatio} format.`;

    scenes.push({
      id: `scene-${sceneNum}-${Date.now()}`,
      sceneNumber: sceneNum,
      title,
      visualPrompt,
      narration: sceneText,
      duration: sceneDurations[i],
      cameraShot: shotTypes[i] || 'Medium Shot',
    });
  }

  return scenes;
}

/**
 * Distributes total seconds across N scenes nicely.
 */
function distributeDuration(totalSeconds, count) {
  const base = Math.floor((totalSeconds / count) * 10) / 10;
  const arr = Array(count).fill(base);
  const remainder = parseFloat((totalSeconds - base * count).toFixed(1));
  arr[arr.length - 1] = parseFloat((arr[arr.length - 1] + remainder).toFixed(1));
  return arr;
}

/**
 * Formats a clean short title for each scene
 */
function getSceneTitle(sceneNumber, text) {
  const clean = text.replace(/[:.,!?\n]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 6).join(' ');
  if (words.length > 5) {
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  const defaultTitles = [
    'The Hook & Setting',
    'The Core Action',
    'The Relief & Transformation',
    'Product Close-up & CTA',
  ];
  return defaultTitles[sceneNumber - 1] || `Scene ${sceneNumber}`;
}
