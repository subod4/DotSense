import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Screen 1: Home / Start Screen
 * - Clean, high-contrast interface
 * - Single prominent "Start Learning" button
 * - Secondary controls for accessibility
 * - Voice-first, zero visual dependency
 */
function BrailleHome() {
  const navigate = useNavigate();
  const [isSlowMode, setIsSlowMode] = useState(false);

  const handleStartLearning = () => {
    // Audio cue: "Starting learning session"
    navigate('/braille/learning');
  };

  const handleRepeatInstructions = () => {
    // Audio cue: "Welcome to Braille Learning. Press Start Learning to begin."
    const msg = new SpeechSynthesisUtterance(
      "Welcome to Braille Learning. Press Start Learning to begin. Use Slow Mode for a slower pace."
    );
    window.speechSynthesis.speak(msg);
  };

  const toggleSlowMode = () => {
    setIsSlowMode(!isSlowMode);
    // Audio cue: "Slow mode on/off"
    const msg = new SpeechSynthesisUtterance(
      isSlowMode ? "Slow mode off" : "Slow mode on"
    );
    window.speechSynthesis.speak(msg);
  };

  return (
    <div className="braille-home" role="main" aria-label="Braille Learning Home">
      {/* Accessibility announcement */}
      <div className="sr-only" aria-live="polite">
        Welcome to Braille Learning Tool. Press Start Learning button to begin your session.
      </div>

      <div className="braille-home__container">
        {/* Main title - high contrast */}
        <h1 className="braille-home__title">
          <span className="braille-home__icon" aria-hidden="true">⠃</span>
          Braille Learning
        </h1>

        {/* Primary action - large, prominent */}
        <button
          className="btn-primary btn-large braille-home__start"
          onClick={handleStartLearning}
          aria-label="Start learning session"
          autoFocus
        >
          <span className="btn-icon" aria-hidden="true">▶</span>
          <span className="btn-text">Start Learning</span>
        </button>

        {/* Secondary controls - accessible but less prominent */}
        <div className="braille-home__controls">
          <button
            className="btn-secondary btn-icon-text"
            onClick={handleRepeatInstructions}
            aria-label="Repeat instructions"
          >
            <span className="icon-repeat" aria-hidden="true">🔊</span>
            <span>Repeat Instructions</span>
          </button>

          <button
            className={`btn-secondary btn-icon-text ${isSlowMode ? 'active' : ''}`}
            onClick={toggleSlowMode}
            aria-label={`Slow mode ${isSlowMode ? 'on' : 'off'}, click to toggle`}
            aria-pressed={isSlowMode}
          >
            <span className="icon-turtle" aria-hidden="true">🐢</span>
            <span>Slow Mode {isSlowMode ? 'On' : 'Off'}</span>
          </button>

          <button
            className="btn-secondary btn-icon-text"
            onClick={() => navigate('/')}
            aria-label="Exit to home"
          >
            <span className="icon-exit" aria-hidden="true">⏏</span>
            <span>Exit</span>
          </button>
        </div>

        {/* Accessibility notes */}
        <div className="braille-home__accessibility-notes">
          <p className="sr-only">
            This application is fully accessible with screen readers.
            All visual elements have audio equivalents.
            Use Tab to navigate, Enter to activate buttons.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BrailleHome;
