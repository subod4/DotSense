// src/utils/braille.js
/**
 * Braille Display & Utility Functions - Production Ready
 */

/**
 * Convert Braille dots array to 2D visual display
 * @param {number[]} dots - 6-position Braille pattern [0,1,2,3,4,5]
 * @returns {string[][]} 3x2 grid of '⬤' (filled) / '○' (empty)
 */
export function dotsToDisplay(dots) {
  // Standard Braille layout: positions 1-3 (left), 4-6 (right)
  const display = [
    [dots[0] === 1, dots[3] === 1],  // Row 1: dots 1,4
    [dots[1] === 1, dots[4] === 1],  // Row 2: dots 2,5  
    [dots[2] === 1, dots[5] === 1],  // Row 3: dots 3,6
  ];
  
  return display.map(row => 
    row.map(filled => filled ? '⬤' : '○')
  );
}

/**
 * Complete Braille alphabet (A-Z)
 */
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Format duration for display
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time (e.g. "2m 30s", "45s")
 */
export function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0s';
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Get Tailwind color class based on accuracy percentage
 * @param {number} accuracy - 0.0 to 1.0
 * @returns {string} Tailwind CSS class
 */
export function getAccuracyColor(accuracy) {
  if (accuracy >= 0.90) return 'text-green-600 font-bold';
  if (accuracy >= 0.75) return 'text-yellow-600 font-semibold';
  if (accuracy >= 0.50) return 'text-orange-600';
  return 'text-red-600 font-bold';
}

/**
 * Get motivational streak message
 * @param {number} streak - Current streak count
 * @returns {string} Emoji-enhanced message
 */
export function getStreakMessage(streak) {
  if (streak >= 15) return '🏆 LEGENDARY! Unbeatable! 🏆';
  if (streak >= 10) return '🔥 ON FIRE! Incredible! 🔥';
  if (streak >= 7)  return '⭐ PHENOMENAL! Perfect run! ⭐';
  if (streak >= 5)  return '🎉 FANTASTIC! Amazing streak! 🎉';
  if (streak >= 3)  return '✨ EXCELLENT! Keep it up! ✨';
  return '';
}

/**
 * Get letter dots from letter (A-Z) - Reference lookup
 * @param {string} letter - Single letter A-Z
 * @returns {number[]} 6-position Braille pattern
 */
export function getLetterDots(letter) {
  const normalized = letter.toLowerCase();
  const brailleMap = {
    'a': [1],
    'b': [1,2],
    'c': [1,4],
    'd': [1,4,5],
    'e': [1,5],
    'f': [1,2,4],
    'g': [1,2,4,5],
    'h': [1,2,5],
    'i': [2,4],
    'j': [2,4,5],
    'k': [1,3],
    'l': [1,2,3],
    'm': [1,3,4],
    'n': [1,3,4,5],
    'o': [1,3,5],
    'p': [1,2,3,4],
    'q': [1,2,3,4,5],
    'r': [1,2,3,5],
    's': [2,3,4],
    't': [2,3,4,5],
    'u': [3,6],
    'v': [1,2,3,6],
    'w': [2,4,5,6],
    'x': [1,3,4,6],
    'y': [1,3,4,5,6],
    'z': [1,3,5,6]
  };
  
  return brailleMap[normalized] || [];
}

/**
 * Get completion percentage for alphabet progress
 * @param {string[]} mastered - Array of mastered letters
 * @returns {number} Percentage complete (0-100)
 */
export function getAlphabetProgress(mastered) {
  const masteredSet = new Set(mastered.map(l => l.toLowerCase()));
  return Math.round((masteredSet.size / ALPHABET.length) * 100);
}

/**
 * Generate progress bar width for UI
 * @param {number} progress - 0-100 percentage
 * @returns {string} CSS width style
 */
export function getProgressBarWidth(progress) {
  return `${Math.max(0, Math.min(100, progress))} %`;
}

/**
 * Format accuracy percentage for display
 * @param {number} accuracy - 0.0-1.0
 * @returns {string} "95%" formatted
 */
export function formatAccuracy(accuracy) {
  return `${Math.round(accuracy * 100)}%`;
}

/**
 * Check if letter is considered "mastered"
 * @param {number} accuracy - Letter accuracy
 * @param {number} threshold - Mastery threshold (default 0.9)
 * @returns {boolean}
 */
export function isLetterMastered(accuracy, threshold = 0.9) {
  return accuracy >= threshold;
}
