// src/components/Home.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Brain, 
  Trophy, 
  TrendingUp, 
  Zap, 
  Clock, 
  Target,
  BarChart3 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const brailleData = {
  lettersMastered: 3,
  totalLetters: 26,
  accuracy: 78,
  streak: 5,
  timePracticed: '2h 45m',
  bestScore: 95
};

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    lettersMastered: 0,
    accuracy: 0,
    streak: 0,
    timePracticed: '0m'
  });

  // Simulate loading real stats from API
  useEffect(() => {
    if (user) {
      // Replace with actual API call
      const timer = setTimeout(() => {
        setStats(brailleData);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleStartTutorial = () => navigate('/tutorial');
  const handleStartLearning = () => navigate('/learn');
  const handleViewStats = () => navigate('/stats');

  return (
    <div className="space-y-8 p-4 md:p-0">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 md:p-12 text-white text-center">
        <div className="text-6xl mb-6 animate-bounce">👋</div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome back, {user?.name || 'Learner'}!
        </h2>
        <p className="text-xl text-blue-100 mb-2">
          Master Braille alphabet with AI-powered learning
        </p>
        <p className="text-blue-100 mb-8">
          Choose your learning path and continue your journey!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <button
            onClick={handleStartTutorial}
            className="flex-1 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <BookOpen size={20} />
            Start Tutorial
          </button>
          <button
            onClick={handleStartLearning}
            className="flex-1 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold text-lg hover:bg-white/30 transition-all border-2 border-white/30 flex items-center justify-center gap-2"
          >
            <Brain size={20} />
            Practice Now
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Letters Mastered</p>
              <p className="text-2xl font-bold">{stats.lettersMastered}/{brailleData.totalLetters}</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all"
              style={{ width: `${(stats.lettersMastered / brailleData.totalLetters) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Accuracy</p>
              <p className="text-2xl font-bold">{stats.accuracy}%</p>
            </div>
          </div>
          <div className="text-sm opacity-80">Great progress! 🎉</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Streak</p>
              <p className="text-2xl font-bold">{stats.streak} days</p>
            </div>
          </div>
          <div className="text-sm opacity-80">Keep it up! 🔥</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Time Practiced</p>
              <p className="text-2xl font-bold">{stats.timePracticed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Tutorial Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/50 hover:shadow-3xl transition-all hover:-translate-y-2 group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <BookOpen className="text-white" size={36} />
            </div>
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Tutorial Mode</h3>
              <p className="text-gray-600 font-medium">Perfect for beginners</p>
            </div>
          </div>

          <p className="text-gray-700 mb-8 leading-relaxed text-lg">
            Learn the Braille alphabet step-by-step with interactive lessons, audio guidance, and visual demonstrations.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">26 letters systematically</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Audio pronunciation</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Interactive patterns</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Voice recognition</span>
            </div>
          </div>

          <button
            onClick={handleStartTutorial}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            🚀 Start Tutorial
          </button>
        </div>

        {/* Learning Mode Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/50 hover:shadow-3xl transition-all hover:-translate-y-2 group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Brain className="text-white" size={36} />
            </div>
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Learning Mode</h3>
              <p className="text-gray-600 font-medium">AI-Powered Practice</p>
            </div>
          </div>

          <p className="text-gray-700 mb-8 leading-relaxed text-lg">
            Adaptive practice that focuses on your weak areas with real-time feedback and performance analytics.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Adaptive difficulty</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Weak letter focus</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Real-time feedback</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm">Performance metrics</span>
            </div>
          </div>

          <button
            onClick={handleStartLearning}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            🧠 Start Practice
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={handleViewStats}
          className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 flex flex-col items-center gap-3"
        >
          <BarChart3 className="w-12 h-12 group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <p className="font-bold text-xl">Detailed Stats</p>
            <p className="text-sm opacity-90">View analytics</p>
          </div>
        </button>
        
        <button
          onClick={handleViewStats}
          className="group bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 flex flex-col items-center gap-3"
        >
          <Target className="w-12 h-12 group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <p className="font-bold text-xl">Set Goals</p>
            <p className="text-sm opacity-90">Track progress</p>
          </div>
        </button>

        <div className="md:col-span-1" />
      </div>

      {/* Pro Tips & Goals */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">💡</span>
            </div>
            <h3 className="text-2xl font-bold text-blue-900">Pro Tips</h3>
          </div>
          <div className="space-y-4">
            {[
              "Practice 15 minutes daily for best retention",
              "Focus on 3-5 letters per session",
              "Use voice recognition for pronunciation",
              "Take short breaks every 20 minutes",
              "Review weak letters first each session"
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white/60 rounded-2xl hover:bg-white transition-all">
                <span className="text-blue-600 font-bold text-xl mt-1">•</span>
                <span className="text-gray-800">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 border border-emerald-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">🎯</span>
            </div>
            <h3 className="text-2xl font-bold text-emerald-900">Your Goals</h3>
          </div>
          <div className="space-y-3">
            {[
              { text: "Master basic alphabet", progress: 15 },
              { text: "90%+ accuracy", progress: 78 },
              { text: "7-day streak", progress: 5 },
              { text: "5 hours practice", progress: 165 }
            ].map((goal, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/70 rounded-2xl">
                <span className="font-medium text-gray-800">{goal.text}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-700">{goal.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
