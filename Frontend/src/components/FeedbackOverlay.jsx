import { useEffect } from 'react';

/**
 * Screen 3: Feedback Overlay
 * - Modal overlay appearing over main screen
 * - Success (green) or Correction (orange) feedback
 * - Auto-dismisses after short delay
 * - Minimal, non-intrusive design
 */
function FeedbackOverlay({ type, message, onClose }) {
  useEffect(() => {
    // Auto-dismiss after 2 seconds
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 2000);

    // Announce feedback to screen readers
    const announcement = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(announcement);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`feedback-overlay ${type}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="feedback-overlay__content">
        {/* Icon */}
        <div className="feedback-icon" aria-hidden="true">
          {isSuccess ? (
            <svg className="icon-checkmark" viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="45" fill="#4CAF50" />
              <path
                d="M30 50 L45 65 L70 35"
                stroke="white"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg className="icon-almost" viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="45" fill="#FF9800" />
              <text
                x="50"
                y="70"
                fontSize="60"
                fill="white"
                textAnchor="middle"
                fontWeight="bold"
              >
                ≈
              </text>
            </svg>
          )}
        </div>

        {/* Message */}
        <p className="feedback-message">
          {message}
        </p>
      </div>
    </div>
  );
}

export default FeedbackOverlay;
