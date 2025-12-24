// src/utils/speechHelpers.js
/**
 * Extract letter from various speech patterns - Production Ready
 */
export function extractLetter(transcript) {
  let cleaned = transcript.toLowerCase().trim();

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,!?;:"']$/, '');

  // 1. Direct Pattern Matching (most common first)
  const patterns = [
    /^the letter ([a-z])$/i,
    /^letter ([a-z])$/i,
    /^([a-z])$/i,
    /^capital ([a-z])$/i,
    /^lowercase ([a-z])$/i,
    /^it's ([a-z])$/i,
    /^this is ([a-z])$/i
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 2. NATO Phonetic Alphabet + Common Words (expanded)
  const mappings = {
    // A
    'alpha': 'a', 'apple': 'a', 'ay': 'a',
    // B
    'bravo': 'b', 'boy': 'b', 'bee': 'b', 'be': 'b',
    // C
    'charlie': 'c', 'sea': 'c', 'see': 'c',
    // D
    'delta': 'd', 'dog': 'd', 'dee': 'd',
    // E
    'echo': 'e', 'ee': 'e',
    // F
    'foxtrot': 'f', 'fox': 'f', 'eff': 'f',
    // G
    'golf': 'g', 'gee': 'g', 'go': 'g',
    // H
    'hotel': 'h', 'haitch': 'h', 'aitch': 'h',
    // I
    'india': 'i', 'eye': 'i',
    // J
    'juliet': 'j', 'jay': 'j', 'jee': 'j',
    // K
    'kilo': 'k', 'kay': 'k', 'key': 'k',
    // L
    'lima': 'l', 'el': 'l', 'ell': 'l',
    // M
    'mike': 'm', 'em': 'm',
    // N
    'november': 'n', 'en': 'n',
    // O
    'oscar': 'o', 'oh': 'o', 'owe': 'o',
    // P
    'papa': 'p', 'pea': 'p', 'pee': 'p',
    // Q
    'quebec': 'q', 'cue': 'q', 'queue': 'q',
    // R
    'romeo': 'r', 'are': 'r',
    // S
    'sierra': 's', 'ess': 's',
    // T
    'tango': 't', 'tea': 't', 'tee': 't',
    // U
    'uniform': 'u', 'you': 'u',
    // V
    'victor': 'v',
    // W
    'whiskey': 'w', 'double-u': 'w',
    // X
    'xray': 'x', 'ex': 'x', 'ecks': 'x',
    // Y
    'yankee': 'y', 'why': 'y', 'wye': 'y',
    // Z
    'zulu': 'z', 'zee': 'z', 'zed': 'z'
  };

  // Check exact match first
  if (mappings[cleaned]) {
    return mappings[cleaned];
  }

  // Check if first word matches (handles "alpha bravo" → "a")
  const firstWord = cleaned.split(' ')[0];
  if (mappings[firstWord]) {
    return mappings[firstWord];
  }

  // 3. Single letter fallback
  if (cleaned.length === 1 && /[a-z]/.test(cleaned)) {
    return cleaned;
  }

  // 4. First letter of multi-word (handles "the letter a" → "a")
  const firstLetterMatch = cleaned.match(/^[a-z]/);
  if (firstLetterMatch) {
    return firstLetterMatch[0];
  }

  return cleaned;
}

/**
 * Get user-friendly speech recognition error messages
 */
export function getSpeechErrorMessage(error) {
  const messages = {
    'no-speech': 'No speech detected. Speak clearly and try again.',
    'audio-capture': 'Microphone access denied. Check browser permissions.',
    'not-allowed': 'Microphone permission required. Enable in browser settings.',
    'network': 'Network error. Check your internet connection.',
    'aborted': 'Listening cancelled.',
    'service-not-allowed': 'Speech recognition unavailable. Use Chrome, Edge, or Safari.',
    'language-not-supported': 'Language not supported. Using English (en-US).'
  };

  return messages[error] || 'Speech recognition error. Please try again.';
}

/**
 * Get encouraging feedback messages based on performance
 */
export function getEncouragementMessage(isCorrect, streak = 0, attempts = 1) {
  if (isCorrect) {
    if (streak >= 10) return "🔥 INCREDIBLE! You're unstoppable! 🔥";
    if (streak >= 7) return "🎉 PHENOMENAL! Perfect streak! 🎉";
    if (streak >= 5) return "⭐ FANTASTIC! Amazing consistency! ⭐";
    if (streak >= 3) return "✨ EXCELLENT! Great momentum! ✨";
    return "✅ PERFECT! Well done! ✅";
  } else {
    if (attempts <= 2) return "🤏 Close! Try one more time! 💪";
    if (attempts <= 4) return "📈 Almost there! Listen carefully! 🎯";
    return "💪 Don't give up! You've got this! 💪";
  }
}

/**
 * Clean speech transcript for better matching
 */
export function cleanTranscript(transcript) {
  return transcript
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s*(a|the|letter)\s*/i, '')
    .replace(/\s*(please|say|repeat)\s*$/i, '');
}

/**
 * Check if transcript contains command vs letter
 */
export function isCommand(transcript) {
  const cleaned = cleanTranscript(transcript);
  const commands = [
    'next', 'next letter', 'continue', 'go', 'forward',
    'previous', 'back', 'go back', 'prev',
    'repeat', 'again', 'say again', 'what was that',
    'stop', 'cancel', 'exit', 'quit',
    'home', 'main', 'menu'
  ];
  
  return commands.some(cmd => cleaned.includes(cmd));
}

/**
 * Get confidence score for letter match (0-1)
 */
export function getLetterConfidence(transcript, targetLetter) {
  const cleaned = cleanTranscript(transcript);
  const target = targetLetter.toLowerCase();
  
  // Exact match
  if (cleaned === target) return 1.0;
  
  // NATO phonetic match
  const phoneticWords = Object.entries({
    'a': ['alpha', 'apple'],
    'b': ['bravo', 'boy'],
    'c': ['charlie', 'sea'],
    // ... add more as needed
  });
  
  for (const [letter, words] of phoneticWords) {
    if (letter === target && words.some(word => cleaned.includes(word))) {
      return 0.9;
    }
  }
  
  // Single letter with extra words
  if (cleaned.includes(target) && cleaned.length <= 15) {
    return 0.85;
  }
  
  return 0.0;
}
