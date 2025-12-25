// API Services for backend integration
import { api } from './client.js'

/**
 * User Management Service
 */
export const userService = {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {number} [userData.age] - User age
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    return api.post('/api/users/create', { body: userData })
  },

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getById(userId) {
    return api.get(`/api/users/${userId}`)
  },

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<Object>} User data
   */
  async getByUsername(username) {
    return api.get(`/api/users/username/${username}`)
  },

  /**
   * Update user information
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async update(userId, updates) {
    return api.put(`/api/users/${userId}`, { body: updates })
  },

  /**
   * Delete user (soft delete)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Delete result
   */
  async delete(userId) {
    return api.del(`/api/users/${userId}`)
  },

  /**
   * List all users
   * @param {Object} [params] - Query parameters
   * @param {number} [params.skip=0] - Number of records to skip
   * @param {number} [params.limit=100] - Maximum number of records
   * @returns {Promise<Array>} List of users
   */
  async list(params = {}) {
    return api.get('/api/users/', { query: params })
  },
}

/**
 * Learning Engine Service
 */
export const learningService = {
  /**
   * Get the next letter to learn
   * @param {string} userId - User ID
   * @param {Array<string>} availableLetters - Available letters for learning
   * @returns {Promise<Object>} Next learning step
   */
  async getStep(userId, availableLetters) {
    const response = await api.post('/api/learning/step', {
      body: { user_id: userId, available_letters: availableLetters },
    });
    // Determine the letter to send to Braille display
    let letterToSend = null;
    if (typeof response === 'string') {
        letterToSend = response;
    } else if (response && typeof response.letter === 'string') {
        letterToSend = response.letter;
    } else if (response && typeof response.next_letter === 'string') {
        letterToSend = response.next_letter;
    }

    if (letterToSend) {
      try {
        await api.post('/api/braille/letter', { body: { letter: letterToSend } });
      } catch (err) {
        // Optionally handle/log error
      }
    }
    return response;
  },

  /**
   * Record a learning attempt
   * @param {Object} attemptData - Attempt data
   * @param {string} attemptData.user_id - User ID
   * @param {string} attemptData.target_letter - Target letter
   * @param {string} attemptData.spoken_letter - Spoken letter
   * @param {number} attemptData.response_time - Response time in seconds
   * @param {string} [attemptData.session_id] - Session ID
   * @returns {Promise<Object>} Attempt result with feedback
   */
  async recordAttempt(attemptData) {
    return api.post('/api/learning/attempt', { body: attemptData })
  },

  /**
   * Get user learning statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getStats(userId) {
    return api.get(`/api/learning/stats/${userId}`)
  },

  /**
   * Get AI-powered learning insights and predictions
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Learning insights
   */
  async getInsights(userId) {
    return api.get(`/api/learning/insights/${userId}`)
  },

  /**
   * Reset user learning progress
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reset result
   */
  async resetProgress(userId) {
    return api.post(`/api/learning/reset/${userId}`)
  },

  /**
   * Get user learning sessions
   * @param {string} userId - User ID
   * @param {number} [limit=10] - Maximum number of sessions
   * @returns {Promise<Array>} List of sessions
   */
  async getSessions(userId, limit = 10) {
    return api.get(`/api/learning/sessions/${userId}`, { query: { limit } })
  },

  /**
   * Get user learning attempts
   * @param {string} userId - User ID
   * @param {number} [limit=20] - Maximum number of attempts
   * @returns {Promise<Array>} List of attempts
   */
  async getAttempts(userId, limit = 20) {
    return api.get(`/api/learning/attempts/${userId}`, { query: { limit } })
  },

  /**
   * Update time spent in learning mode
   * @param {string} userId - User ID
   * @param {number} seconds - Time spent in seconds
   * @returns {Promise<Object>} Update result
   */
  async updateTimeSpent(userId, seconds) {
    return api.post('/api/learning/time', { body: { user_id: userId, seconds } })
  },
}


/**
 * Tutorial Service
 */
export const tutorialService = {
  /**
   * Start a new tutorial session
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Tutorial session with first letter data
   */
  async start(userId) {
    const response = await api.post('/api/tutorial/start', { body: { user_id: userId } });
    // POST the response to /api/braille/letter
    try {
      await api.post('/api/braille/letter', { body: response });
    } catch (err) {
      // Optionally handle/log error
    }
    return response;
  },

  /**
   * Get current tutorial step
   * @param {string} tutorialId - Tutorial session ID
   * @returns {Promise<Object>} Current step data with letter, dots, spoken_text
   */
  async getStep(tutorialId) {
    return api.get('/api/tutorial/step', { query: { tutorial_id: tutorialId } })
  },

  /**
   * Move to next letter
   * @param {string} tutorialId - Tutorial session ID
   * @returns {Promise<Object>} Next step data
   */
  async next(tutorialId) {
    return api.post('/api/tutorial/next', { body: { tutorial_id: tutorialId } })
  },

  /**
   * Move to previous letter
   * @param {string} tutorialId - Tutorial session ID
   * @returns {Promise<Object>} Previous step data
   */
  async previous(tutorialId) {
    return api.post('/api/tutorial/previous', { body: { tutorial_id: tutorialId } })
  },

  /**
   * Repeat current letter
   * @param {string} tutorialId - Tutorial session ID
   * @returns {Promise<Object>} Current step data
   */
  async repeat(tutorialId) {
    return api.post('/api/tutorial/repeat', { body: { tutorial_id: tutorialId } })
  },

  /**
   * Jump to specific letter
   * @param {string} tutorialId - Tutorial session ID
   * @param {string} letter - Letter to jump to (a-z)
   * @returns {Promise<Object>} Step data for the letter
   */
  async jump(tutorialId, letter) {
    return api.post('/api/tutorial/jump', { query: { tutorial_id: tutorialId, letter } })
  },

  /**
   * End tutorial session
   * @param {string} tutorialId - Tutorial session ID
   * @returns {Promise<Object>} End status
   */
  async end(tutorialId) {
    return api.post('/api/tutorial/end', { body: { tutorial_id: tutorialId } })
  },

  /**
   * Get full Braille alphabet
   * @returns {Promise<Object>} Complete alphabet with dot patterns
   */
  async getAlphabet() {
    return api.get('/api/tutorial/alphabet')
  },
}

/**
 * Health Check Service
 */
export const healthService = {
  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async check() {
    return api.get('/health')
  },
}