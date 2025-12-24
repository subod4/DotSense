/**
 * Learning Engine Constants
 * Advanced configuration for adaptive learning system
 */

export const LEARNING_CONSTANTS = {
  // Core performance thresholds
  MAX_RESPONSE_TIME: 6.0,
  MASTERY_HIGH: 0.85,
  MASTERY_MID: 0.6,
  MIN_ATTEMPTS_FOR_MASTERY: 5,
  CONFIDENCE_Z_SCORE: 1.96,

  // SM-2 Spaced Repetition
  SM2_MIN_EASINESS: 1.3,
  SM2_MAX_INTERVAL: 365,
  SM2_INITIAL_INTERVAL: 1,

  // Adaptive Difficulty
  DIFFICULTY_ADJUSTMENT_RATE: 0.1,
  TARGET_SUCCESS_RATE_MIN: 0.6,
  TARGET_SUCCESS_RATE_MAX: 0.85,

  // Trend Analysis
  TREND_WINDOW: 10,
  TREND_THRESHOLD_IMPROVING: 0.15,
  TREND_THRESHOLD_DECLINING: -0.15,

  // Fatigue Detection
  FATIGUE_THRESHOLD: 0.7,
  MAX_SESSION_LENGTH: 30, // minutes

  // Retention / Forgetting Curve
  RETENTION_HALF_LIFE: 86400, // 1 day in seconds

  // Achievement Thresholds
  STREAK_MILESTONE_1: 5,
  STREAK_MILESTONE_2: 10,
  STREAK_MILESTONE_3: 25,
  MASTERY_MILESTONE_1: 5,
  MASTERY_MILESTONE_2: 10,
  MASTERY_MILESTONE_3: 26,
};

/**
 * Feedback messages for different scenarios
 */
export const FEEDBACK_MESSAGES = {
  // Correct answers
  perfect: '🎉 Perfect! Great job!',
  correct: '✅ Correct! Well done!',
  excellent: '🌟 Excellent! You\'re on fire!',
  streak_bonus: '🔥 Amazing streak! Keep it up!',
  streak_milestone: '🔥 Incredible streak!',
  mastery_achieved: '🏆 You\'ve mastered this letter!',
  good_progress: '👍 Good progress!',
  improving: '📈 You\'re improving! Keep going!',
  correct_letter: '✅ Correct!',

  // Incorrect answers
  confusion_help: '🤔 That was a different letter. Listen again!',
  try_again: '💪 Not quite. Give it another try!',
  keep_practicing: '📚 Keep practicing, you\'ll get it!',
  wrong_letter: '❌ Oops! That wasn\'t the right letter.',
  similar_sound: '🔊 These letters sound similar. Listen carefully!',
  take_break: '😴 Consider taking a short break.',
  fatigue_detected: '💤 You seem tired. A break might help!',

  // Achievements
  achievement_unlocked: '🏆 Achievement Unlocked!',

  // General
  new_letter: '✨ Let\'s learn a new letter!',
  review_time: '🔄 Time to review this letter.',
  challenge: '🎯 Challenge mode! Show what you\'ve learned!',
};

/**
 * Mastery level configurations
 */
export const MASTERY_LEVELS = {
  new: {
    color: '#4b5563', // Gray-600
    label: 'New',
    description: 'Not yet practiced',
    priority: 4,
  },
  weak: {
    color: '#dc2626', // Red-600
    label: 'Needs Work',
    description: 'Struggling with this letter',
    priority: 1,
  },
  learning: {
    color: '#d97706', // Amber-600
    label: 'Learning',
    description: 'Making progress',
    priority: 2,
  },
  mastered: {
    color: '#059669', // Emerald-600
    label: 'Mastered',
    description: 'Well learned!',
    priority: 3,
  },
};

/**
 * Learning modes configuration
 */
export const LEARNING_MODES = {
  guided: {
    label: 'Guided Learning',
    description: 'Structured introduction to new letters',
    icon: '📚',
  },
  revision: {
    label: 'Revision',
    description: 'Focus on letters that need work',
    icon: '🔄',
  },
  review: {
    label: 'Review',
    description: 'Keep mastered letters fresh',
    icon: '🧠',
  },
  spaced_review: {
    label: 'Spaced Review',
    description: 'Scientifically-timed review session',
    icon: '⏰',
  },
  confusion_drill: {
    label: 'Confusion Drill',
    description: 'Practice commonly confused letters',
    icon: '🎯',
  },
  challenge: {
    label: 'Challenge',
    description: 'Test your skills!',
    icon: '🏆',
  },
};

/**
 * Fetch constants from backend API
 * Call this once on app initialization
 */
export async function fetchLearningConstants(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/api/constants`);
    if (!response.ok) throw new Error('Failed to fetch constants');
    const data = await response.json();

    // Update the constants object
    Object.assign(LEARNING_CONSTANTS, {
      MAX_RESPONSE_TIME: data.MAX_RESPONSE_TIME ?? LEARNING_CONSTANTS.MAX_RESPONSE_TIME,
      MASTERY_HIGH: data.MASTERY_HIGH ?? LEARNING_CONSTANTS.MASTERY_HIGH,
      MASTERY_MID: data.MASTERY_MID ?? LEARNING_CONSTANTS.MASTERY_MID,
      MIN_ATTEMPTS_FOR_MASTERY: data.MIN_ATTEMPTS_FOR_MASTERY ?? LEARNING_CONSTANTS.MIN_ATTEMPTS_FOR_MASTERY,
      CONFIDENCE_Z_SCORE: data.CONFIDENCE_Z_SCORE ?? LEARNING_CONSTANTS.CONFIDENCE_Z_SCORE,
    });

    return LEARNING_CONSTANTS;
  } catch (error) {
    console.warn('Using default learning constants:', error.message);
    return LEARNING_CONSTANTS;
  }
}
