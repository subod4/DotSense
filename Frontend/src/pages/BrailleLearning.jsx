import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FeedbackOverlay from '../components/FeedbackOverlay';
import { learningService } from '../api/services.js';
import { api } from '../api/client.js';

/**
 * Screen 2: Active Learning Session
 * - Status bar with mode and timer
 * - Soundwave visualization for audio state
 * - Braille dots visual representation
 * - Progress tracking
 * - Accessible controls
 */
function BrailleLearning() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user || { id: 'kid_01' }; // Get user from navigation state
  
  const [mode, setMode] = useState('Guided'); // Guided or Practice
  const [sessionTime, setSessionTime] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [currentDots, setCurrentDots] = useState([false, false, false, false, false, false]);
  const [progress, setProgress] = useState(0);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'correction', message: string }
  const [practicedCount, setPracticedCount] = useState(0);
  
  // Backend integration state
  const [currentLetter, setCurrentLetter] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId] = useState(() => `SESSION-${Date.now()}`);
  const [startTime, setStartTime] = useState(null);
  const [stats, setStats] = useState(null);

  // Available letters for learning
  const availableLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  // Timer for session
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial letter from backend
  useEffect(() => {
    loadNextLetter();
  }, []);

  // Load next letter from backend
  async function loadNextLetter() {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await learningService.getStep(user.id, availableLetters);
      
      setCurrentLetter(result.next_letter || 'a');
      setReason(result.reason || 'New letter to practice.');
      setStartTime(Date.now());
      
      // Fetch dots for the letter
      await fetchDotsForLetter(result.next_letter || 'a');
    } catch (err) {
      console.error('Error loading next letter:', err);
      setError('Failed to load next letter');
      // Fallback to first letter
      setCurrentLetter('a');
      setStartTime(Date.now());
    } finally {
      setLoading(false);
    }
  }

  // Fetch braille dots for a letter
  async function fetchDotsForLetter(letter) {
    try {
      const res = await api.get(`/api/esp32/letter/${encodeURIComponent(letter)}`);
      if (res?.dots && Array.isArray(res.dots)) {
        setCurrentDots(res.dots);
      }
    } catch (err) {
      console.error('Error fetching dots:', err);
      // Keep default dots on error
    }
  }

  // Record attempt to backend
  async function recordAttempt(spokenLetter) {
    if (!user?.id || !currentLetter || !startTime) return null;
    
    const responseTime = (Date.now() - startTime) / 1000;
    
    try {
      const result = await learningService.recordAttempt({
        user_id: user.id,
        target_letter: currentLetter,
        spoken_letter: spokenLetter,
        response_time: responseTime,
        session_id: sessionId
      });
      return result;
    } catch (err) {
      console.error('Error recording attempt:', err);
      return null;
    }
  }

  // Load user stats
  async function loadStats() {
    if (!user?.id) return;
    
    try {
      const statsResult = await learningService.getStats(user.id);
      setStats(statsResult);
      if (statsResult.overall_accuracy != null) {
        setProgress(Math.round(statsResult.overall_accuracy * 100));
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRepeat = () => {
    // Audio cue: Repeat current question with actual letter
    const msg = new SpeechSynthesisUtterance(`What letter is this? ${currentLetter.toUpperCase()}`);
    if (isSlowMode) {
      msg.rate = 0.7;
    }
    window.speechSynthesis.speak(msg);
  };

  const toggleSlowMode = () => {
    setIsSlowMode(!isSlowMode);
    const msg = new SpeechSynthesisUtterance(
      isSlowMode ? "Slow mode off" : "Slow mode on"
    );
    window.speechSynthesis.speak(msg);
  };

  const simulateAnswer = async (correct) => {
    // Simulate user answer - in real app this would come from speech recognition
    const spokenLetter = correct ? currentLetter : availableLetters[Math.floor(Math.random() * availableLetters.length)];
    
    // Record attempt to backend
    const attemptResult = await recordAttempt(spokenLetter);
    
    const isCorrect = spokenLetter.toLowerCase() === currentLetter.toLowerCase();
    
    setFeedback({
      type: isCorrect ? 'success' : 'correction',
      message: isCorrect ? 'Good job!' : `Almost! The letter was ${currentLetter.toUpperCase()}`
    });
    
    if (isCorrect) {
      setPracticedCount(prev => prev + 1);
      // Update progress from backend stats
      await loadStats();
    }

    // Clear feedback and load next letter
    setTimeout(async () => {
      setFeedback(null);
      if (practicedCount >= 4) {
        // Navigate to summary after 5 practices
        navigate('/braille/summary', { 
          state: { 
            practicedCount: practicedCount + 1,
            user,
            sessionId,
            stats
          } 
        });
      } else {
        await loadNextLetter();
      }
    }, 2000);
  };

  const startListening = () => {
    setIsListening(true);
    // Simulate listening state - in real app this would use Web Speech API
    setTimeout(() => {
      setIsListening(false);
      // Simulate recognition result (would be replaced with actual speech recognition)
      simulateAnswer(Math.random() > 0.3); // 70% chance of correct answer for demo
    }, 2000);
  };

  return (
    <div className="braille-learning" role="main" aria-label="Braille Learning Session">
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? "Loading next letter" : ""}
        {isListening ? "Listening for your answer" : ""}
        {feedback ? feedback.message : ""}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="braille-learning__error" role="alert">
          {error}
        </div>
      )}

      {/* Top Status Bar */}
      <header className="braille-learning__status-bar" role="banner">
        <div className="status-bar__mode">
          <span className="status-label">Mode:</span>
          <span className="status-value">{mode}</span>
        </div>
        <div className="status-bar__letter">
          <span className="status-label">Letter:</span>
          <span className="status-value">{currentLetter.toUpperCase() || '—'}</span>
        </div>
        <div className="status-bar__timer" aria-label={`Session time ${formatTime(sessionTime)}`}>
          <span className="status-label">Time:</span>
          <span className="status-value">{formatTime(sessionTime)}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="braille-learning__content">
        {/* Audio State Visualization */}
        <div className="audio-state" aria-label={isListening ? "Listening" : "Ready to listen"}>
          <div className={`soundwave ${isListening ? 'active' : ''}`}>
            {isListening ? (
              <>
                <div className="wave-bar" aria-hidden="true"></div>
                <div className="wave-bar" aria-hidden="true"></div>
                <div className="wave-bar" aria-hidden="true"></div>
                <div className="wave-bar" aria-hidden="true"></div>
                <div className="wave-bar" aria-hidden="true"></div>
              </>
            ) : (
              <div className="mic-icon" aria-hidden="true">🎤</div>
            )}
          </div>
          <p className="audio-state__label">
            {isListening ? 'Listening...' : 'Press to speak'}
          </p>
        </div>

        {/* Braille Dots Representation */}
        <div className="braille-dots" role="img" aria-label="Braille pattern display">
          <div className="dots-grid">
            {currentDots.map((filled, index) => (
              <div
                key={index}
                className={`braille-dot ${filled ? 'filled' : 'empty'}`}
                aria-label={`Dot ${index + 1} ${filled ? 'filled' : 'empty'}`}
              />
            ))}
          </div>
          <p className="sr-only">Visual representation of braille dots for current letter</p>
        </div>

        {/* Control Buttons */}
        <div className="braille-learning__controls">
          <button
            className="btn-control btn-icon-large"
            onClick={handleRepeat}
            aria-label="Repeat question"
          >
            <span className="icon-repeat" aria-hidden="true">🔄</span>
            <span className="btn-label">Repeat</span>
          </button>

          <button
            className={`btn-control btn-icon-large ${isSlowMode ? 'active' : ''}`}
            onClick={toggleSlowMode}
            aria-label={`Slow mode ${isSlowMode ? 'on' : 'off'}`}
            aria-pressed={isSlowMode}
          >
            <span className="icon-turtle" aria-hidden="true">🐢</span>
            <span className="btn-label">Slow Mode</span>
          </button>

          <button
            className="btn-control btn-icon-large"
            onClick={startListening}
            aria-label="Start listening"
          >
            <span className="icon-mic" aria-hidden="true">🎤</span>
            <span className="btn-label">Listen</span>
          </button>
        </div>

        {/* Demo buttons for testing feedback */}
        <div className="demo-controls" style={{ marginTop: '2rem' }}>
          <button className="btn-secondary" onClick={() => simulateAnswer(true)} disabled={loading}>
            Simulate Correct Answer
          </button>
          <button className="btn-secondary" onClick={() => simulateAnswer(false)} disabled={loading}>
            Simulate Wrong Answer
          </button>
        </div>

        {/* Reason/hint from backend */}
        {reason && (
          <div className="braille-learning__reason" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <small className="muted">{reason}</small>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="braille-learning__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="progress-label">{progress}% Complete</p>
      </div>

      {/* Feedback Overlay */}
      {feedback && (
        <FeedbackOverlay type={feedback.type} message={feedback.message} />
      )}
    </div>
  );
}

export default BrailleLearning;
