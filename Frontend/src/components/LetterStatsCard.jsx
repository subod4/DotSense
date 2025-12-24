import {
  calculateAccuracy,
  calculateSkillScore,
  calculateMasteryLevel,
  calculateProbabilityCorrect,
  calculateConfidenceInterval,
  getMasteryColor,
  getMasteryClass,
  formatAccuracy,
  formatResponseTime,
} from '../utils/learningCalculations';

/**
 * Letter Statistics Card Component
 * Displays all calculated metrics for a single letter
 */
export default function LetterStatsCard({ letterStats, compact = false }) {
  // Perform all calculations on the frontend
  const accuracy = calculateAccuracy(letterStats);
  const skillScore = calculateSkillScore(letterStats);
  const masteryLevel = calculateMasteryLevel(letterStats);
  const probabilityCorrect = calculateProbabilityCorrect(letterStats);
  const confidenceInterval = calculateConfidenceInterval(letterStats);
  const masteryColor = getMasteryColor(masteryLevel);

  if (compact) {
    return (
      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${masteryLevel === 'mastered' ? 'bg-green-500/10 border-green-500/20' :
        masteryLevel === 'learning' ? 'bg-blue-500/10 border-blue-500/20' :
          'bg-surface-soft border-surface-border'
        }`}>
        <div className="text-xl font-black">{letterStats.letter.toUpperCase()}</div>
        <div className="font-bold">{formatAccuracy(accuracy)}</div>
        <div className="text-sm font-medium">{letterStats.streak || 0}🔥</div>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-2xl bg-surface border border-surface-border flex flex-col gap-4 hover:border-surface-border/80 transition-colors group"
      style={{ '--mastery-color': masteryColor }}
    >
      {/* Letter Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-border/50">
        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary">
          {letterStats.letter.toUpperCase()}
        </span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface-soft border border-surface-border text-text-muted">
          {masteryLevel}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Accuracy */}
        <div className="p-2 rounded-lg bg-surface-soft/50 text-center">
          <span className="text-[10px] uppercase text-text-muted font-bold block mb-1">Accuracy</span>
          <span className="text-lg font-bold block leading-none">{formatAccuracy(accuracy)}</span>
          <span className="text-[10px] text-text-muted">{letterStats.correct}/{letterStats.attempts}</span>
        </div>

        {/* Skill Score */}
        <div className="p-2 rounded-lg bg-surface-soft/50 text-center">
          <span className="text-[10px] uppercase text-text-muted font-bold block mb-1">Skill</span>
          <span className="text-lg font-bold block leading-none">{Math.round(skillScore * 100)}</span>
          <span className="text-[10px] text-text-muted">/ 100</span>
        </div>

        {/* Response Time */}
        <div className="p-2 rounded-lg bg-surface-soft/50 text-center">
          <span className="text-[10px] uppercase text-text-muted font-bold block mb-1">Speed</span>
          <span className="text-lg font-bold block leading-none">{formatResponseTime(letterStats.avg_response_time)}</span>
        </div>

        {/* Streak */}
        <div className="p-2 rounded-lg bg-surface-soft/50 text-center">
          <span className="text-[10px] uppercase text-text-muted font-bold block mb-1">Streak</span>
          <span className="text-lg font-bold block leading-none">{letterStats.streak || 0} 🔥</span>
          <span className="text-[10px] text-text-muted">Best: {letterStats.best_streak || 0}</span>
        </div>
      </div>

      {/* Advanced Stats */}
      <div className="text-[10px] text-text-muted space-y-1 pt-2 border-t border-surface-border/50">
        <div className="flex justify-between">
          <span>Probability:</span>
          <span className="font-bold">{Math.round(probabilityCorrect * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Confidence:</span>
          <span className="font-bold">{Math.round(confidenceInterval.lower * 100)}% - {Math.round(confidenceInterval.upper * 100)}%</span>
        </div>
      </div>

      {/* Confused With */}
      {letterStats.confused_with && Object.keys(letterStats.confused_with).length > 0 && (
        <div className="pt-2 border-t border-surface-border/50 space-y-2">
          <span className="text-[10px] font-bold text-accent-danger uppercase tracking-wider">Confused with</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(letterStats.confused_with)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([letter, count]) => (
                <span key={letter} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-[10px] font-bold">
                  {letter.toUpperCase()} <span className="opacity-70">×{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
