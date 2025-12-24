
import { useState, useEffect } from 'react';
import { api } from '../api/api.js';

import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  Trophy,
  Target,
  Zap,
  Clock,
  TrendingUp,
  Award,
  Home,
  Loader,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity,
  Star,
} from 'lucide-react';
import { getAccuracyColor } from '../../utils/Braille.jsx';

export function Statistics({ onExit }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;

      try {
        // Load all data in parallel
        const [statsData, sessionsData, attemptsData, achievementsData] = await Promise.all([
          api.getLearningStats(user.user_id),
          api.getUserSessions(user.user_id, 5).catch(() => []),
          api.getUserAttempts(user.user_id, { limit: 10 }).catch(() => []),
          api.getUserAchievements(user.user_id).catch(() => []),
        ]);

        setStats(statsData);
        setSessions(sessionsData);
        setAttempts(attemptsData);
        setAchievements(achievementsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const lettersMastered = stats.letters_mastered || [];
  const confusedLetters = stats.confused_letters || [];

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-1">{label}</div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds) => {
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Learning Progress</h2>
          <p className="text-gray-600 mt-1">Track your Braille mastery journey</p>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Home size={20} />
          Home
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Overall Accuracy"
          value={`${(stats.overall_accuracy * 100).toFixed(1)}%`}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Zap}
          label="Current Streak"
          value={stats.current_streak}
          color="bg-gradient-to-br from-orange-500 to-red-500"
          subtitle={`Best: ${stats.longest_streak}`}
        />
        <StatCard
          icon={Trophy}
          label="Total Attempts"
          value={stats.total_attempts}
          color="bg-gradient-to-br from-purple-500 to-pink-500"
          subtitle={`${stats.correct_attempts} correct`}
        />
        <StatCard
          icon={Clock}
          label="Time Spent"
          value={`${Math.floor(stats.time_spent_minutes)}m`}
          color="bg-gradient-to-br from-green-500 to-emerald-500"
          subtitle={`${stats.session_count} sessions`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Letters Mastered */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="text-green-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">
              Letters Mastered ({lettersMastered.length}/26)
            </h3>
          </div>

          {lettersMastered.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lettersMastered.map((letter) => (
                <div
                  key={letter}
                  className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-lg border-2 border-green-300"
                >
                  {letter}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Award size={48} className="mx-auto mb-3 opacity-50" />
              <p>Start practicing to master letters!</p>
            </div>
          )}

          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(lettersMastered.length / 26) * 100}%` }}
              />
            </div>
            <div className="text-sm text-gray-600 mt-2 text-center">
              {((lettersMastered.length / 26) * 100).toFixed(0)}% Complete
            </div>
          </div>
        </div>

        {/* Need More Practice */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="text-yellow-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">Need More Practice</h3>
          </div>

          {confusedLetters.length > 0 ? (
            <div className="space-y-3">
              {confusedLetters.slice(0, 8).map((item) => (
                <div key={item.letter} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 text-yellow-700 rounded-lg flex items-center justify-center font-bold">
                      {item.letter}
                    </div>
                    <span className="font-medium text-gray-700">Letter {item.letter.toUpperCase()}</span>
                  </div>
                  <span className={`font-semibold ${getAccuracyColor(item.accuracy)}`}>
                    {(item.accuracy * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-3 opacity-50" />
              <p>No struggling letters yet. Keep practicing!</p>
            </div>
          )}
        </div>
      </div>

      {/* Session History */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="text-indigo-600" size={24} />
          <h3 className="text-xl font-bold text-gray-900">Recent Sessions</h3>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.session_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center">
                    {session.session_type === 'tutorial' ? '📖' : '🧠'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 capitalize">{session.session_type} Mode</div>
                    <div className="text-sm text-gray-500">{formatDate(session.start_time)}</div>
                  </div>
                </div>
                {session.duration_minutes !== undefined && (
                  <div className="text-sm font-semibold text-gray-700">{Math.floor(session.duration_minutes)}m</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 opacity-50" />
            <p>No sessions recorded yet. Start learning!</p>
          </div>
        )}
      </div>

      {/* Recent Attempts */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-purple-600" size={24} />
          <h3 className="text-xl font-bold text-gray-900">Recent Attempts</h3>
        </div>

        {attempts.length > 0 ? (
          <div className="space-y-2">
            {attempts.map((attempt) => (
              <div key={attempt.attempt_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      attempt.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {attempt.letter.toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-700">
                      Spoke: <span className="font-semibold">{attempt.spoken_letter.toUpperCase()}</span>
                    </span>
                    {attempt.is_correct ? (
                      <span className="text-green-600 ml-2">✓</span>
                    ) : (
                      <span className="text-red-600 ml-2">✗</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{formatTime(attempt.response_time)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity size={48} className="mx-auto mb-3 opacity-50" />
            <p>No attempts recorded yet. Start practicing!</p>
          </div>
        )}
      </div>

      {/* Backend Achievements */}
      {achievements.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Star className="text-yellow-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">Earned Achievements</h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div key={achievement.achievement_id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200">
                <div className="text-3xl mb-2">🏅</div>
                <div className="font-semibold text-gray-900">{achievement.achievement_name}</div>
                <div className="text-sm text-gray-600 capitalize">{achievement.achievement_type}</div>
                <div className="text-xs text-gray-500 mt-2">{formatDate(achievement.earned_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frontend Calculated Achievements */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Trophy size={48} />
          <div>
            <h3 className="text-2xl font-bold">Your Achievements</h3>
            <p className="text-blue-100">Milestones you've reached</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.total_attempts >= 10 && (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-3xl mb-2">🎯</div>
              <div className="font-semibold">Getting Started</div>
              <div className="text-sm text-blue-100">10+ attempts completed</div>
            </div>
          )}

          {stats.longest_streak >= 5 && (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-3xl mb-2">🔥</div>
              <div className="font-semibold">On Fire!</div>
              <div className="text-sm text-blue-100">5+ answer streak</div>
            </div>
          )}

          {lettersMastered.length >= 5 && (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-3xl mb-2">⭐</div>
              <div className="font-semibold">Quick Learner</div>
              <div className="text-sm text-blue-100">5+ letters mastered</div>
            </div>
          )}

          {stats.overall_accuracy >= 0.8 && stats.total_attempts >= 20 && (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-3xl mb-2">🏆</div>
              <div className="font-semibold">Accuracy Expert</div>
              <div className="text-sm text-blue-100">80%+ accuracy</div>
            </div>
          )}

          {stats.time_spent_minutes >= 30 && (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-3xl mb-2">⏰</div>
              <div className="font-semibold">Dedicated</div>
              <div className="text-sm text-blue-100">30+ minutes practiced</div>
            </div>
          )}

          {lettersMastered.length === 26 && (
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="text-3xl mb-2">🎓</div>
              <div className="font-semibold">Master!</div>
              <div className="text-sm text-blue-100">All letters mastered</div>
            </div>
          )}
        </div>

        {stats.total_attempts < 10 && (
          <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 text-center">
            <p className="text-blue-100">Keep practicing to unlock more achievements!</p>
          </div>
        )}
      </div>
    </div>
  );
}