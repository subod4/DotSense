import { dotsToDisplay } from "../../utils/Braille";

export function BrailleDisplay({ dots, size = 'md', showLabel, letter }) {
  const display = dotsToDisplay(dots);
  
  const sizeClasses = {
    sm: 'text-2xl gap-1',
    md: 'text-4xl gap-2',
    lg: 'text-6xl gap-3',
  };

  const dotSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`flex flex-wrap items-center justify-center ${sizeClasses[size]}`}>
        {display.map((column, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {column.map((isDot, dotIdx) => (
              <div
                key={dotIdx}
                className={`${dotSizeClasses[size]} rounded-full transition-all ${
                  isDot ? 'bg-blue-600 shadow-md' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      {showLabel && letter && (
        <div className="text-center">
          <p className="text-sm text-gray-600">Letter: {letter.toUpperCase()}</p>
        </div>
      )}
    </div>
  );
}