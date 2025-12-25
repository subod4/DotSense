import { useState, useCallback } from 'react';
import { learningService } from '../api/services';

/**
 * Custom hook for fetching the next letter recommendation
 * Posts to the learning step endpoint and manages state
 * 
 * @param {string} userId - User ID
 * @param {Array<string>} availableLetters - Available letters for learning
 * @returns {Object} Hook state and functions
 */
export function useNextLetter(userId, availableLetters = []) {
  const [nextLetter, setNextLetter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch the next recommended letter from the backend
   * @param {Array<string>} [letters] - Override available letters (optional)
   * @returns {Promise<any>} Next letter recommendation
   */
  const fetchNextLetter = useCallback(async (letters) => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const lettersToUse = letters || availableLetters;
      const response = await learningService.getStep(userId, lettersToUse);
      
      // Store the response as nextLetter (can be string or object)
      setNextLetter(response);
      return response;
    } catch (err) {
      console.error('Error fetching next letter:', err);
      setError(err.message || 'Failed to fetch next letter');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, availableLetters]);

  /**
   * Clear the current next letter state
   */
  const clearNextLetter = useCallback(() => {
    setNextLetter(null);
    setError(null);
  }, []);

  return {
    fetchNextLetter,
    nextLetter,
    loading,
    error,
    clearNextLetter,
  };
}

export default useNextLetter;
