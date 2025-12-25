import { useState, useCallback } from 'react';
import {
  calculateAccuracy,
  calculateSkillScore,
  calculateMasteryLevel,
} from '../utils/learningCalculations';
import { learningService } from '../api/services';

/**
 * Custom hook for recording learning attempts
 * Submits attempt data and enriches the result with calculated metrics
 * 
 * @returns {Object} Hook state and functions
 */
export function useRecordAttempt() {
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Record a learning attempt
   * @param {Object} attemptData - Attempt data
   * @param {string} attemptData.user_id - User ID
   * @param {string} attemptData.target_letter - Target letter
   * @param {string} attemptData.spoken_letter - Spoken letter
   * @param {number} attemptData.response_time - Response time in seconds
   * @param {string} [attemptData.session_id] - Session ID
   * @returns {Promise<Object>} Enriched result with feedback
   */
  const recordAttempt = useCallback(async (attemptData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await learningService.recordAttempt(attemptData);
      
      // Extract result and feedback from response
      const rawResult = response.result || response;
      const rawFeedback = response.feedback || null;

      // Enrich the result with calculated metrics
      const enrichedResult = {
        ...rawResult,
        accuracy: rawResult.attempts > 0 
          ? calculateAccuracy(rawResult) 
          : 0,
        skillScore: calculateSkillScore(rawResult),
        masteryLevel: calculateMasteryLevel(rawResult),
      };

      setResult(enrichedResult);
      setFeedback(rawFeedback);

      return { result: enrichedResult, feedback: rawFeedback };
    } catch (err) {
      console.error('Error recording attempt:', err);
      setError(err.message || 'Failed to record attempt');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear the current result and feedback
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setFeedback(null);
    setError(null);
  }, []);

  return {
    recordAttempt,
    result,
    feedback,
    loading,
    error,
    clearResult,
  };
}

export default useRecordAttempt;
