import { useEffect } from 'react';
import { useLearningStats } from '../hooks/useLearningStats';
import { fetchLearningConstants } from '../utils/learningConstants';
import { getMasteryColor } from '../utils/learningCalculations';
import LetterStatsCard from './LetterStatsCard';

/**
 * Learning Dashboard Component
 * Displays overall progress and individual letter statistics
 */
export default function LearningDashboard({ userId, onClose }) {
  const {
    stats,
    letters,
    insights,
    loading,
    error,
    fetchStats,
    resetProgress
  } = useLearningStats(userId);

  // Fetch constants on mount
  useEffect(() => {
    fetchLearningConstants(import.meta.env.VITE_API_URL);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-surface-border border-t-primary rounded-full animate-spin" />
        <p className="text-text-muted">Loading your progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-surface border border-surface-border text-center space-y-6">
        <div className="text-4xl">⚠️</div>
        <p className="text-accent-danger font-medium">{error}</p>
        <button className="px-6 py-2 rounded-xl bg-primary text-background font-bold hover:bg-primary/90 transition-colors" onClick={fetchStats}>Try Again</button>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Learning Progress</h1>
          <p className="text-text-muted">User: <strong className="text-text">{userId}</strong></p>
        </div>
        {onClose && (
          <button className="p-2 rounded-full hover:bg-surface-soft text-text-muted hover:text-text transition-colors" onClick={onClose} aria-label="Close dashboard">
            <span className="text-xl">✕</span>
          </button>
        )}
      </header>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-surface-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Overall Accuracy</span>
            <div className="text-3xl font-black text-text mt-1 mb-1">{Math.round(insights.overallAccuracy * 100)}%</div>
            <span className="text-sm font-medium text-text-muted">{insights.totalAttempts} attempts</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors" />
          <div className="relative z-10">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Letters Practiced</span>
            <div className="text-3xl font-black text-text mt-1 mb-1">{insights.lettersPracticed}</div>
            <span className="text-sm font-medium text-text-muted">of 26</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-accent-amber/5 rounded-full blur-2xl group-hover:bg-accent-amber/10 transition-colors" />
          <div className="relative z-10">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Avg Response</span>
            <div className="text-3xl font-black text-text mt-1 mb-1">{insights.avgResponseTime.toFixed(1)}s</div>
            <span className="text-sm font-medium text-text-muted">{insights.avgResponseTime < 3 ? '⚡ Fast!' : 'Keep going'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="relative z-10">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Strongest</span>
            <div className="text-3xl font-black text-text mt-1 mb-1">{insights.strongestLetter?.toUpperCase() || '—'}</div>
            <span className="text-sm font-medium text-text-muted">🏆 Champion</span>
          </div>
        </div>
      </div>

      {/* Mastery Distribution */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
        <h2 className="text-lg font-bold">Mastery Distribution</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <span className="w-20 text-sm font-medium text-text-muted">Mastered</span>
            <div className="flex-1 h-3 bg-surface-soft rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(insights.masteryDistribution.mastered / 26) * 100}%` }}
              />
            </div>
            <span className="w-8 text-sm font-bold text-right">{insights.masteryDistribution.mastered}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-sm font-medium text-text-muted">Learning</span>
            <div className="flex-1 h-3 bg-surface-soft rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500"
                style={{ width: `${(insights.masteryDistribution.learning / 26) * 100}%` }}
              />
            </div>
            <span className="w-8 text-sm font-bold text-right">{insights.masteryDistribution.learning}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-sm font-medium text-text-muted">Weak</span>
            <div className="flex-1 h-3 bg-surface-soft rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-danger transition-all duration-500"
                style={{ width: `${(insights.masteryDistribution.weak / 26) * 100}%` }}
              />
            </div>
            <span className="w-8 text-sm font-bold text-right">{insights.masteryDistribution.weak}</span>
          </div>
        </div>
      </div>

      {/* Needs Practice Alert */}
      {insights.needsPractice.length > 0 && (
        <div className="p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex gap-4 items-start">
          <span className="text-xl">⚠️</span>
          <div>
            <strong className="text-accent-amber font-bold block mb-1">Needs Practice</strong>
            <p className="text-sm text-text-muted">Focus on these letters to improve: {insights.needsPractice.map(l => l.toUpperCase()).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Letter Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Letter Statistics</h2>
        {letters.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {letters
              .sort((a, b) => b.attempts - a.attempts)
              .map(letterStats => (
                <LetterStatsCard key={letterStats.letter} letterStats={letterStats} />
              ))}
          </div>
        ) : (
          <div className="p-12 rounded-3xl bg-surface border border-surface-border border-dashed text-center space-y-2">
            <span className="text-4xl block mb-2">📚</span>
            <p className="font-bold">No letters practiced yet</p>
            <p className="text-sm text-text-muted">Start your learning journey!</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
        <button
          className="px-4 py-2 rounded-xl text-sm font-medium border border-surface-border hover:bg-surface-soft hover:text-text transition-colors"
          onClick={fetchStats}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
        <button
          className="px-4 py-2 rounded-xl text-sm font-bold bg-accent-danger/10 text-accent-danger border border-accent-danger/20 hover:bg-accent-danger hover:text-white transition-colors"
          onClick={() => {
            if (confirm('Are you sure you want to reset all progress?')) {
              resetProgress();
            }
          }}
          disabled={loading}
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}
