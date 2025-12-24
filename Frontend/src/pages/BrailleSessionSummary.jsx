import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Screen 4: Session Summary
 * - Celebration elements
 * - Large stats display
 * - Grid of practiced letters
 * - Continue/Finish buttons
 * - Bright, encouraging design
 */
function BrailleSessionSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const practicedCount = location.state?.practicedCount || 5;
  
  // Sample practiced letters - in real app, this would come from session data
  const practicedLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, practicedCount);

  useEffect(() => {
    // Audio celebration on load
    const msg = new SpeechSynthesisUtterance(
      `Congratulations! You practiced ${practicedCount} letter${practicedCount !== 1 ? 's' : ''} today!`
    );
    window.speechSynthesis.speak(msg);
  }, [practicedCount]);

  const handleContinue = () => {
    // Audio cue: "Starting new session"
    const msg = new SpeechSynthesisUtterance("Starting new session");
    window.speechSynthesis.speak(msg);
    navigate('/braille/learning');
  };

  const handleFinish = () => {
    // Audio cue: "Goodbye! Great job today!"
    const msg = new SpeechSynthesisUtterance("Goodbye! Great job today!");
    window.speechSynthesis.speak(msg);
    navigate('/braille');
  };

  return (
    <div className="braille-summary" role="main" aria-label="Learning session summary">
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Session complete. You practiced {practicedCount} letters.
      </div>

      <div className="braille-summary__container">
        {/* Celebration Header */}
        <div className="celebration-header">
          <div className="confetti" aria-hidden="true">
            <span className="confetti-piece">⭐</span>
            <span className="confetti-piece">✨</span>
            <span className="confetti-piece">🌟</span>
            <span className="confetti-piece">⭐</span>
            <span className="confetti-piece">✨</span>
          </div>
          <h1 className="celebration-title">Great Job!</h1>
        </div>

        {/* Main Stat Display */}
        <div className="summary-stat" aria-label={`You practiced ${practicedCount} letters`}>
          <div className="stat-number">{practicedCount}</div>
          <div className="stat-label">Letter{practicedCount !== 1 ? 's' : ''} Practiced</div>
        </div>

        {/* Practiced Letters Grid */}
        <div className="practiced-letters" role="region" aria-label="Letters you practiced">
          <h2 className="practiced-letters__title">Today's Practice</h2>
          <div className="letters-grid">
            {practicedLetters.map((letter, index) => (
              <div
                key={index}
                className="letter-card"
                role="article"
                aria-label={`Letter ${letter}`}
              >
                <div className="letter-card__braille" aria-hidden="true">
                  {getBrailleDots(letter)}
                </div>
                <div className="letter-card__text">{letter}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="braille-summary__actions">
          <button
            className="btn-primary btn-large"
            onClick={handleContinue}
            aria-label="Continue to new session"
          >
            <span className="btn-icon" aria-hidden="true">▶</span>
            <span className="btn-text">Continue</span>
          </button>

          <button
            className="btn-secondary btn-large"
            onClick={handleFinish}
            aria-label="Finish and return to home"
          >
            <span className="btn-icon" aria-hidden="true">✓</span>
            <span className="btn-text">Finish</span>
          </button>
        </div>

        {/* Encouragement Message */}
        <div className="encouragement" role="complementary">
          <p className="encouragement-text">
            You're doing amazing! Keep practicing every day.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to get braille dot pattern for a letter
 * Returns a visual representation (for wireframe purposes)
 */
function getBrailleDots(letter) {
  const patterns = {
    'A': '⠁',
    'B': '⠃',
    'C': '⠉',
    'D': '⠙',
    'E': '⠑',
  };
  return patterns[letter] || '⠿';
}

export default BrailleSessionSummary;
