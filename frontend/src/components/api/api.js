// src/services/api.js
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const User = {
  // User shape for reference
};

export const UserCreateRequest = {
  // UserCreateRequest shape for reference
};

export const UserUpdateRequest = {
  // UserUpdateRequest shape for reference
};

export const TutorialStep = {
  // TutorialStep shape for reference
};

export const TutorialLetter = {
  // TutorialLetter shape for reference
};

export const TutorialAlphabetItem = {
  // TutorialAlphabetItem shape for reference
};

export const AdaptiveLearningResponse = {
  // AdaptiveLearningResponse shape for reference
};

export const AttemptResult = {
  // AttemptResult shape for reference
};

export const LearningStats = {
  // LearningStats shape for reference
};

export const UserProgress = {
  // UserProgress shape for reference
};

class APIService {
  async fetch(endpoint, options) {
    const url = `${API_BASE_URL}${endpoint}`;
    const init = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    };

    if (import.meta.env.DEV) {
      console.debug('[API] Request:', init.method || 'GET', url, init);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      let body;
      try {
        body = await res.json();
      } catch {
        try {
          body = await res.text();
        } catch {
          body = '<no response body>';
        }
      }
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      throw new Error(`API ${res.status} ${res.statusText}: ${bodyStr}`);
    }

    try {
      return (await res.json());
    } catch {
      return {};
    }
  }

  // ---------- User management ----------
  async createUser(payload) {
    return this.fetch('/api/users/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUser(userId) {
    return this.fetch(`/api/users/${encodeURIComponent(userId)}`);
  }

  async updateUser(userId, updates) {
    return this.fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(userId) {
    return this.fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  async login(username) {
    try {
      const user = await this.getUser(username);
      return { user_id: user.user_id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404')) {
        const created = await this.createUser({ username });
        return { user_id: created.user_id };
      }

      try {
        const created = await this.createUser({ username });
        return { user_id: created.user_id };
      } catch (createErr) {
        const createMsg = createErr instanceof Error ? createErr.message : String(createErr);
        if (createMsg.includes('Username already exists') || createMsg.includes('400')) {
          const user = await this.getUser(username);
          return { user_id: user.user_id };
        }
        throw createErr;
      }
    }
  }

  async register(username, age) {
    return this.createUser({ username, age });
  }

  async startSession(userId, sessionType) {
    return this.fetch('/api/users/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, session_type: sessionType }),
    });
  }

  async endSession(sessionId) {
    return this.fetch('/api/users/sessions/end', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  async getUserSessions(userId, limit = 10) {
    return this.fetch(`/api/users/sessions/${encodeURIComponent(userId)}?limit=${limit}`);
  }

  async recordUserAttempt(payload) {
    return this.fetch('/api/users/attempts/record', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUserAttempts(userId, opts) {
    const params = new URLSearchParams();
    if (opts?.letter) params.set('letter', opts.letter);
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const suffix = qs ? `?${qs}` : '';
    return this.fetch(`/api/users/attempts/${encodeURIComponent(userId)}${suffix}`);
  }

  async getUserProgress(userId) {
    return this.fetch(`/api/users/progress/${encodeURIComponent(userId)}`);
  }

  async awardAchievement(payload) {
    return this.fetch('/api/users/achievements/award', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUserAchievements(userId) {
    return this.fetch(`/api/users/achievements/${encodeURIComponent(userId)}`);
  }

  // ---------- Tutorial mode ----------
  async startTutorial(userId) {
    const res = await this.fetch('/api/tutorial/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    const session_id = res.session_id ?? res.tutorial_id;
    if (!session_id) throw new Error('No session_id returned from startTutorial');
    return { session_id };
  }

  async completeTutorial(sessionId) {
    try {
      return await this.fetch('/api/tutorial/complete', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      return this.fetch('/api/tutorial/end', {
        method: 'POST',
        body: JSON.stringify({ tutorial_id: sessionId }),
      });
    }
  }

  async getCurrentTutorialStep(tutorialId) {
    return this.fetch(`/api/tutorial/step?tutorial_id=${encodeURIComponent(tutorialId)}`);
  }

  async getCurrentTutorialDotsForEsp32(tutorialId) {
    return this.fetch(`/api/tutorial/esp32/dots?tutorial_id=${encodeURIComponent(tutorialId)}`);
  }

  async nextTutorialLetter(tutorialId) {
    return this.fetch('/api/tutorial/next', {
      method: 'POST',
      body: JSON.stringify({ tutorial_id: tutorialId }),
    });
  }

  async previousTutorialLetter(tutorialId) {
    return this.fetch('/api/tutorial/previous', {
      method: 'POST',
      body: JSON.stringify({ tutorial_id: tutorialId }),
    });
  }

  async repeatTutorialLetter(tutorialId) {
    return this.fetch('/api/tutorial/repeat', {
      method: 'POST',
      body: JSON.stringify({ tutorial_id: tutorialId }),
    });
  }

  async jumpToTutorialLetter(tutorialId, letter) {
    return this.fetch('/api/tutorial/jump', {
      method: 'POST',
      body: JSON.stringify({ tutorial_id: tutorialId, letter }),
    });
  }

  async endTutorial(tutorialId) {
    return this.fetch('/api/tutorial/end', {
      method: 'POST',
      body: JSON.stringify({ tutorial_id: tutorialId }),
    });
  }

  async getAlphabet() {
    return this.fetch('/api/tutorial/alphabet');
  }

  // ---------- Learning mode ----------
  async getAdaptiveLetter(userId, availableLetters) {
    return this.fetch('/api/learning/step', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, available_letters: availableLetters }),
    });
  }

  async recordLearningAttempt(params) {
    return this.fetch('/api/learning/attempt', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getLearningStats(userId) {
    return this.fetch(`/api/learning/stats/${encodeURIComponent(userId)}`);
  }

  async resetLearning(userId) {
    return this.fetch(`/api/learning/reset/${encodeURIComponent(userId)}`, { method: 'POST' });
  }

  async getLearningDotsForEsp32(userId) {
    return this.fetch(`/api/esp32/learning/dots?user_id=${encodeURIComponent(userId)}`);
  }

  // ---------- ESP32 Utility ----------
  async getBrailleDots(letter) {
    return this.fetch(`/api/esp32/letter/${encodeURIComponent(letter)}`);
  }

  // ---------- Root & Health ----------
  async getRoot() {
    return this.fetch('/');
  }

  async health() {
    return this.fetch('/api/health');
  }
}

export const api = new APIService();
