import { Trophy, TrendingUp, Sparkles, Target } from 'lucide-react';
import HeroSection from './Hero'; // Adjust path as needed

function HomePage({ onViewStats }) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Stats Preview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shadow-inner">
            <Trophy className="text-amber-600" size={28} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Track Your Progress</h3>
            <p className="text-gray-600">Monitor your learning journey</p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 shadow-inner border border-emerald-100">
            <p className="text-gray-600 text-sm mb-1">Overall Accuracy</p>
            <p className="text-3xl font-bold text-emerald-600">—</p>
            <p className="text-xs text-gray-500 mt-1">Start learning to track</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 shadow-inner border border-amber-100">
            <p className="text-gray-600 text-sm mb-1">Letters Mastered</p>
            <p className="text-3xl font-bold text-amber-600">0/26</p>
            <p className="text-xs text-gray-500 mt-1">Complete the tutorial</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-inner border border-indigo-100">
            <p className="text-gray-600 text-sm mb-1">Current Streak</p>
            <p className="text-3xl font-bold text-indigo-600">0</p>
            <p className="text-xs text-gray-500 mt-1">Build your streak</p>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 shadow-inner border border-rose-100">
            <p className="text-gray-600 text-sm mb-1">Time Practiced</p>
            <p className="text-3xl font-bold text-rose-600">0m</p>
            <p className="text-xs text-gray-500 mt-1">Start your session</p>
          </div>
        </div>

        <button
          onClick={onViewStats}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200 py-3 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg border border-amber-200"
        >
          <TrendingUp size={20} strokeWidth={1.75} />
          View Detailed Statistics
        </button>
      </div>

      {/* Info Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-8 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-emerald-600" size={24} strokeWidth={1.75} />
            <h3 className="text-xl font-bold text-emerald-900">💡 Pro Tips</h3>
          </div>
          <ul className="space-y-3 text-emerald-800">
            <li className="flex gap-3">
              <span className="font-bold">•</span>
              <span>Practice daily for best results</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">•</span>
              <span>Use voice recognition to improve pronunciation</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">•</span>
              <span>Focus on difficult letters first</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">•</span>
              <span>Take breaks to avoid fatigue</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-indigo-200 p-8 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <Target className="text-indigo-600" size={24} strokeWidth={1.75} />
            <h3 className="text-xl font-bold text-indigo-900">🎯 Your Goals</h3>
          </div>
          <ul className="space-y-3 text-indigo-800">
            <li className="flex gap-3">
              <span className="text-lg">✓</span>
              <span>Master the basic Braille alphabet</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">✓</span>
              <span>Achieve 90%+ accuracy on all letters</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">✓</span>
              <span>Build a 30-day learning streak</span>
            </li>
            <li className="flex gap-3">
              <span className="text-lg">✓</span>
              <span>Complete 100+ practice attempts</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
