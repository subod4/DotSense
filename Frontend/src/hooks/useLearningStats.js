import { useState, useEffect, useCallback } from 'react';
import {
  calculateAccuracy,
  calculateSkillScore,
  calculateMasteryLevel,
  calculateProbabilityCorrect,
  calculateConfidenceInterval,
  calculateLearningInsights,
} from '../utils/learningCalculations';
import { learningService } from '../api/services';

/**
 * Custom hook for managing learning statistics
 * Handles data fetching and client-side calculations
 */
export function useLearningStats(userId) {
  const [stats, setStats] = useState(null);
  const [letters, setLetters] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch and calculate user statistics
   */
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await learningService.getStats(userId);
      setStats(data);
      
      // Extract letters data
      const lettersData = data.letters || [];
      setLetters(lettersData);
      
      // Calculate insights on the frontend
      const calculatedInsights = calculateLearningInsights(lettersData);
      setInsights(calculatedInsights);
    } catch (err) {
      console.error('Error fetching learning stats:', err);
      setError(err.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Get calculated stats for a specific letter
   */
  const getLetterStats = useCallback((letter) => {
    const letterData = letters.find(l => l.letter.toLowerCase() === letter.toLowerCase());
    if (!letterData) return null;
    
    return {
      ...letterData,
      accuracy: calculateAccuracy(letterData),
      skillScore: calculateSkillScore(letterData),
      masteryLevel: calculateMasteryLevel(letterData),
      probabilityCorrect: calculateProbabilityCorrect(letterData),
      confidenceInterval: calculateConfidenceInterval(letterData),
    };
  }, [letters]);

  /**
   * Get all letters with calculated stats
   */
  const getEnhancedLetters = useCallback(() => {
    return letters.map(letterData => ({
      ...letterData,
      accuracy: calculateAccuracy(letterData),
      skillScore: calculateSkillScore(letterData),
      masteryLevel: calculateMasteryLevel(letterData),
      probabilityCorrect: calculateProbabilityCorrect(letterData),
      confidenceInterval: calculateConfidenceInterval(letterData),
    }));
  }, [letters]);

  /**
   * Reset user progress
   */
  const resetProgress = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await learningService.resetProgress(userId);
      await fetchStats(); // Refresh stats
    } catch (err) {
      console.error('Error resetting progress:', err);
      setError(err.message || 'Failed to reset progress');
    } finally {
      setLoading(false);
    }
  }, [userId, fetchStats]);

  // Fetch stats on mount and when userId changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    letters,
    insights,
    loading,
    error,
    fetchStats,
    getLetterStats,
    getEnhancedLetters,
    resetProgress,
  };
}

export default useLearningStats;
