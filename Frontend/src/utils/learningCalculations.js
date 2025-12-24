/**
 * Learning Engine Calculations
 * Advanced client-side calculations for adaptive learning
 */

import { LEARNING_CONSTANTS, MASTERY_LEVELS } from './learningConstants';

/**
 * Calculate accuracy percentage
 * @param {Object} stats - Letter statistics {attempts, correct}
 * @returns {number} Accuracy (0-1)
 */
export function calculateAccuracy(stats) {
  if (!stats || stats.attempts === 0) return 0;
  return Math.min(1, Math.max(0, stats.correct / stats.attempts));
}

/**
 * Calculate speed score based on response time
 * @param {number} avgResponseTime - Average response time in seconds
 * @returns {number} Speed score (0-1)
 */
export function calculateSpeedScore(avgResponseTime) {
  const { MAX_RESPONSE_TIME } = LEARNING_CONSTANTS;
  if (MAX_RESPONSE_TIME <= 0 || avgResponseTime < 0) return 0;
  return Math.max(0, 1.0 - (avgResponseTime / MAX_RESPONSE_TIME));
}

/**
 * Calculate streak bonus
 * @param {number} streak - Current correct streak
 * @returns {number} Bonus score (0-0.1)
 */
export function calculateStreakBonus(streak) {
  return Math.min(0.1, streak * 0.02);
}

/**
 * Calculate consistency bonus based on recent results variance
 * @param {Array<boolean>} recentResults - Array of recent correct/incorrect results
 * @returns {number} Consistency bonus (0-0.05)
 */
export function calculateConsistencyBonus(recentResults) {
  if (!recentResults || recentResults.length < 5) return 0;
  
  const recent = recentResults.slice(-10);
  const mean = recent.reduce((a, b) => a + (b ? 1 : 0), 0) / recent.length;
  const variance = recent.reduce((sum, x) => sum + Math.pow((x ? 1 : 0) - mean, 2), 0) / recent.length;
  
  // Low variance = high consistency = bonus
  const consistency = Math.max(0, 1 - variance * 4);
  return consistency * 0.05;
}

/**
 * Calculate overall skill score
 * @param {Object} stats - Letter statistics {attempts, correct, avg_response_time, streak, recent_results}
 * @returns {number} Skill score (0-1)
 */
export function calculateSkillScore(stats) {
  if (!stats || stats.attempts === 0) return 0;
  
  const accuracy = calculateAccuracy(stats);
  const speedScore = calculateSpeedScore(stats.avg_response_time || 0);
  const streakBonus = calculateStreakBonus(stats.streak || 0);
  const consistencyBonus = calculateConsistencyBonus(stats.recent_results);
  
  const baseScore = (0.6 * accuracy) + (0.25 * speedScore) + streakBonus + consistencyBonus;
  return Math.round(Math.min(1.0, baseScore) * 1000) / 1000;
}

/**
 * Determine mastery level for a letter
 * @param {Object} stats - Letter statistics
 * @returns {string} "weak" | "learning" | "mastered"
 */
export function calculateMasteryLevel(stats) {
  const { MIN_ATTEMPTS_FOR_MASTERY, MASTERY_HIGH, MASTERY_MID } = LEARNING_CONSTANTS;
  
  if (!stats || stats.attempts < MIN_ATTEMPTS_FOR_MASTERY) {
    return 'learning';
  }
  
  const score = calculateSkillScore(stats);
  
  if (score >= MASTERY_HIGH) return 'mastered';
  if (score >= MASTERY_MID) return 'learning';
  return 'weak';
}

/**
 * Calculate probability of correct answer (Bayesian Beta distribution)
 * @param {Object} stats - Letter statistics {attempts, correct}
 * @returns {number} Probability (0-1)
 */
export function calculateProbabilityCorrect(stats) {
  if (!stats) return 0.5;
  
  const correct = Math.max(0, stats.correct);
  const attempts = Math.max(0, stats.attempts);
  const clampedCorrect = Math.min(correct, attempts);
  
  const alpha = clampedCorrect + 1;
  const beta = (attempts - clampedCorrect) + 1;
  
  return Math.round((alpha / (alpha + beta)) * 1000) / 1000;
}

/**
 * Calculate 95% confidence interval for accuracy
 * @param {Object} stats - Letter statistics {attempts, correct}
 * @returns {Object} {lower: number, upper: number}
 */
export function calculateConfidenceInterval(stats) {
  if (!stats || stats.attempts < 2) {
    return { lower: 0.0, upper: 1.0 };
  }
  
  const p = calculateAccuracy(stats);
  const n = stats.attempts;
  const z = LEARNING_CONSTANTS.CONFIDENCE_Z_SCORE;
  
  const variance = (p * (1 - p)) / n;
  const margin = z * Math.sqrt(Math.max(0, variance));
  
  return {
    lower: Math.round(Math.max(0, p - margin) * 1000) / 1000,
    upper: Math.round(Math.min(1, p + margin) * 1000) / 1000,
  };
}

/**
 * Get mastery badge color for UI
 * @param {string} masteryLevel - "weak" | "learning" | "mastered"
 * @returns {string} Color code
 */
export function getMasteryColor(masteryLevel) {
  return MASTERY_LEVELS[masteryLevel]?.color || MASTERY_LEVELS.learning.color;
}

/**
 * Get mastery CSS class
 * @param {string} masteryLevel - "weak" | "learning" | "mastered"
 * @returns {string} CSS class name
 */
export function getMasteryClass(masteryLevel) {
  const classes = {
    new: 'mastery-new',
    weak: 'mastery-weak',
    learning: 'mastery-learning',
    mastered: 'mastery-mastered',
  };
  return classes[masteryLevel] || classes.learning;
}

/**
 * Get mastery label
 * @param {string} masteryLevel - Mastery level
 * @returns {string} Human-readable label
 */
export function getMasteryLabel(masteryLevel) {
  return MASTERY_LEVELS[masteryLevel]?.label || 'Learning';
}

/**
 * Format accuracy as percentage
 * @param {number} accuracy - Accuracy value (0-1)
 * @returns {string} Formatted percentage
 */
export function formatAccuracy(accuracy) {
  return `${Math.round(accuracy * 100)}%`;
}

/**
 * Format response time
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time
 */
export function formatResponseTime(time) {
  return `${(time || 0).toFixed(1)}s`;
}

/**
 * Calculate retention probability using Ebbinghaus forgetting curve
 * @param {number} lastSeen - Unix timestamp of last practice
 * @param {number} easinessFactor - SM-2 easiness factor (default 2.5)
 * @param {number} repetitions - Number of successful repetitions
 * @returns {number} Retention probability (0-1)
 */
export function calculateRetentionProbability(lastSeen, easinessFactor = 2.5, repetitions = 0) {
  const timeElapsed = (Date.now() / 1000) - lastSeen; // seconds
  
  // Stability increases with easiness factor and repetitions
  const stability = easinessFactor * (repetitions + 1) * 86400; // in seconds
  
  // Ebbinghaus forgetting curve: R = e^(-t/S)
  const retention = Math.exp(-timeElapsed / stability);
  
  return Math.min(1.0, Math.max(0.0, retention));
}

/**
 * Analyze performance trend from recent results
 * @param {Array<boolean>} recentResults - Array of recent correct/incorrect results
 * @param {number} overallAccuracy - Overall accuracy for comparison
 * @returns {string} "improving" | "declining" | "stable" | "insufficient_data"
 */
export function analyzePerformanceTrend(recentResults, overallAccuracy = 0) {
  if (!recentResults || recentResults.length < 3) {
    return 'insufficient_data';
  }
  
  const { TREND_THRESHOLD_IMPROVING, TREND_THRESHOLD_DECLINING } = LEARNING_CONSTANTS;
  const window = Math.min(5, recentResults.length);
  const recent = recentResults.slice(-window);
  const recentAccuracy = recent.reduce((a, b) => a + (b ? 1 : 0), 0) / recent.length;
  
  const diff = recentAccuracy - overallAccuracy;
  
  if (diff > TREND_THRESHOLD_IMPROVING) return 'improving';
  if (diff < TREND_THRESHOLD_DECLINING) return 'declining';
  return 'stable';
}

/**
 * Analyze response time trend
 * @param {Array<number>} responseTimes - Array of response times in seconds
 * @returns {string} "speeding_up" | "slowing_down" | "stable" | "insufficient_data"
 */
export function analyzeResponseTimeTrend(responseTimes) {
  if (!responseTimes || responseTimes.length < 3) {
    return 'insufficient_data';
  }
  
  const window = Math.min(5, responseTimes.length);
  const recent = responseTimes.slice(-window);
  const older = responseTimes.slice(0, -window);
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  if (recentAvg < olderAvg * 0.8) return 'speeding_up';
  if (recentAvg > olderAvg * 1.2) return 'slowing_down';
  return 'stable';
}

/**
 * Calculate optimal review time using SM-2 algorithm
 * @param {Object} stats - Letter statistics with SM-2 fields
 * @returns {Date} Optimal review date
 */
export function calculateNextReviewDate(stats) {
  if (!stats) return new Date();
  
  const interval = stats.interval || 1;
  const nextReview = stats.next_review || (Date.now() / 1000);
  
  return new Date(nextReview * 1000);
}

/**
 * Format time until next review
 * @param {number} nextReviewTimestamp - Unix timestamp
 * @returns {string} Human-readable time until review
 */
export function formatTimeUntilReview(nextReviewTimestamp) {
  const now = Date.now() / 1000;
  const secondsUntil = nextReviewTimestamp - now;
  
  if (secondsUntil <= 0) return 'Now';
  if (secondsUntil < 3600) return `${Math.ceil(secondsUntil / 60)}m`;
  if (secondsUntil < 86400) return `${Math.ceil(secondsUntil / 3600)}h`;
  return `${Math.ceil(secondsUntil / 86400)}d`;
}

/**
 * Estimate difficulty of a letter based on user performance
 * @param {Object} stats - Letter statistics
 * @param {Object} allStats - All letter statistics for comparison
 * @returns {number} Difficulty estimate (0-1, higher = harder)
 */
export function estimateLetterDifficulty(stats, allStats = {}) {
  if (!stats || stats.attempts < 3) return 0.5;
  
  const userAccuracy = calculateAccuracy(stats);
  
  // Confusion complexity
  const confusionCount = Object.keys(stats.confused_with || {}).length;
  const confusionFactor = Math.min(1.0, confusionCount * 0.15);
  
  // Response time relative to average
  const allTimes = Object.values(allStats)
    .filter(s => s.attempts > 0)
    .map(s => s.avg_response_time || 0);
  const avgTime = allTimes.length > 0 
    ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length 
    : LEARNING_CONSTANTS.MAX_RESPONSE_TIME / 2;
  const timeFactor = avgTime > 0 
    ? Math.min(1.0, (stats.avg_response_time || 0) / avgTime) 
    : 0.5;
  
  // Combine factors (lower accuracy = higher difficulty)
  const difficulty = (1 - userAccuracy) * 0.5 + confusionFactor * 0.3 + timeFactor * 0.2;
  
  return Math.min(1.0, Math.max(0.0, difficulty));
}

/**
 * Calculate selection priority for adaptive letter selection
 * @param {Object} stats - Letter statistics
 * @param {number} userDifficulty - User's current difficulty level
 * @returns {number} Priority score (higher = should practice sooner)
 */
export function calculateSelectionPriority(stats, userDifficulty = 0.5) {
  if (!stats) return 0;
  
  let priority = 0;
  
  // SM-2 Review urgency (0-30 points)
  const now = Date.now() / 1000;
  if (stats.next_review && now >= stats.next_review) {
    const overdueSeconds = now - stats.next_review;
    const overdueDays = overdueSeconds / 86400;
    priority += Math.min(30, 15 + overdueDays * 5);
  }
  
  // Retention probability (0-25 points)
  const retention = stats.retention || calculateRetentionProbability(
    stats.last_seen || now,
    stats.easiness_factor || 2.5,
    stats.repetition || 0
  );
  if (retention < 0.9) {
    priority += (1 - retention) * 25;
  }
  
  // Performance trend (0-15 points)
  if (stats.trend === 'declining') {
    priority += 15;
  } else if (stats.trend === 'stable' && calculateAccuracy(stats) < LEARNING_CONSTANTS.MASTERY_MID) {
    priority += 8;
  }
  
  // Difficulty matching (0-20 points)
  const difficulty = stats.difficulty || 0.5;
  const difficultyMatch = 1 - Math.abs(difficulty - userDifficulty);
  priority += difficultyMatch * 20;
  
  // Time since last seen (0-10 points)
  const hoursSince = stats.last_seen 
    ? (now - stats.last_seen) / 3600 
    : 0;
  priority += Math.min(10, hoursSince * 0.5);
  
  return priority;
}

/**
 * Detect if user is showing signs of fatigue
 * @param {Object} sessionStats - Current session statistics
 * @param {number} overallAccuracy - User's overall accuracy
 * @returns {boolean} True if fatigue detected
 */
export function detectFatigue(sessionStats, overallAccuracy) {
  if (!sessionStats || sessionStats.attempts < 10) return false;
  
  const sessionAccuracy = sessionStats.correct / sessionStats.attempts;
  
  return sessionAccuracy < overallAccuracy * LEARNING_CONSTANTS.FATIGUE_THRESHOLD;
}

/**
 * Generate personalized recommendations
 * @param {Object} userStats - Complete user statistics
 * @returns {Array<Object>} Array of recommendations
 */
export function generateRecommendations(userStats) {
  const recommendations = [];
  
  if (!userStats || !userStats.letters) return recommendations;
  
  // Find letters needing urgent review
  const urgentReviews = userStats.letters.filter(l => 
    l.needs_review && (l.retention || 1) < 0.7
  );
  
  if (urgentReviews.length > 0) {
    recommendations.push({
      type: 'urgent_review',
      priority: 'high',
      message: `Review ${urgentReviews[0].letter.toUpperCase()} soon - you might be forgetting it!`,
      letters: urgentReviews.slice(0, 3).map(l => l.letter),
    });
  }
  
  // Find declining performance
  const declining = userStats.letters.filter(l => l.trend === 'declining');
  if (declining.length > 0) {
    recommendations.push({
      type: 'declining_performance',
      priority: 'medium',
      message: `Your performance on ${declining[0].letter.toUpperCase()} is declining. Consider a break!`,
      letters: declining.slice(0, 3).map(l => l.letter),
    });
  }
  
  // Check mastery progress
  const mastered = userStats.letters.filter(l => l.mastery_level === 'mastered');
  const total = userStats.letters.length;
  
  if (mastered.length > 0 && mastered.length < total) {
    recommendations.push({
      type: 'progress_update',
      priority: 'low',
      message: `Great progress! ${mastered.length}/${total} letters mastered.`,
      letters: [],
    });
  }
  
  return recommendations;
}

/**
 * Calculate overall learning insights
 * @param {Array} lettersData - Array of letter statistics
 * @returns {Object} Aggregated insights
 */
export function calculateLearningInsights(lettersData) {
  if (!lettersData || lettersData.length === 0) {
    return {
      status: 'beginner',
      message: 'Start practicing letters!',
      overallAccuracy: 0,
      totalAttempts: 0,
      lettersPracticed: 0,
      masteryDistribution: { mastered: 0, learning: 0, weak: 0, new: 0 },
      avgResponseTime: 0,
      strongestLetter: null,
      weakestLetter: null,
      needsPractice: [],
      avgRetention: 1,
      learningVelocity: 0,
    };
  }
  
  const totalAttempts = lettersData.reduce((sum, l) => sum + (l.attempts || 0), 0);
  const totalCorrect = lettersData.reduce((sum, l) => sum + (l.correct || 0), 0);
  const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  
  const masteryDistribution = { mastered: 0, learning: 0, weak: 0, new: 0 };
  const needsPractice = [];
  
  lettersData.forEach(letter => {
    const level = letter.mastery_level || calculateMasteryLevel(letter);
    masteryDistribution[level] = (masteryDistribution[level] || 0) + 1;
    
    if (level === 'weak') {
      needsPractice.push(letter.letter);
    }
  });
  
  const avgResponseTime = lettersData.reduce((sum, l) => 
    sum + (l.avg_response_time || 0), 0
  ) / lettersData.length;
  
  // Find strongest and weakest letters
  let strongestLetter = null;
  let weakestLetter = null;
  let highestScore = -1;
  let lowestScore = 2;
  
  lettersData.forEach(letter => {
    if (letter.attempts < 3) return;
    
    const score = letter.skill_score || calculateSkillScore(letter);
    if (score > highestScore) {
      highestScore = score;
      strongestLetter = letter.letter;
    }
    if (score < lowestScore) {
      lowestScore = score;
      weakestLetter = letter.letter;
    }
  });
  
  // Calculate average retention
  const retentions = lettersData
    .filter(l => l.retention !== undefined)
    .map(l => l.retention);
  const avgRetention = retentions.length > 0 
    ? retentions.reduce((a, b) => a + b, 0) / retentions.length 
    : 1;
  
  return {
    overallAccuracy: Math.round(overallAccuracy * 1000) / 1000,
    totalAttempts,
    lettersPracticed: lettersData.length,
    masteryDistribution,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    strongestLetter,
    weakestLetter,
    needsPractice,
    avgRetention: Math.round(avgRetention * 1000) / 1000,
    learningVelocity: masteryDistribution.mastered / Math.max(1, lettersData.length),
  };
}
