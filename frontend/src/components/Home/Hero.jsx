import { BookOpen } from 'lucide-react';

function HeroSection() {
  return (
    <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-2xl shadow-xl p-12 text-white text-center bg-opacity-95 backdrop-blur-sm">
      <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Welcome to Braille Master</h2>
      <p className="text-xl text-emerald-100 mb-2">Master the Braille alphabet with AI-powered learning</p>
      <p className="text-emerald-100">Choose your learning path and start your journey!</p>
    </div>
  );
}

export default HeroSection;
