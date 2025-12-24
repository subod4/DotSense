// Braille dots are 6 values: [1..6] typically represented in a 2x3 grid.
// Backend returns [d1,d2,d3,d4,d5,d6] where each entry is 0/1.
export default function DotsView({ dots, large = false }) {
  const safe = Array.isArray(dots) && dots.length === 6 ? dots : [0, 0, 0, 0, 0, 0]

  // Grid order: left column (1,2,3) then right column (4,5,6)
  const positions = [
    safe[0], safe[3],
    safe[1], safe[4],
    safe[2], safe[5],
  ]

  const raised = safe
    .map((v, idx) => (v ? idx + 1 : null))
    .filter(Boolean)
  const description =
    raised.length === 0 ? 'No braille dots raised' : `Braille dots raised: ${raised.join(', ')}`

  const sizeClass = large ? 'w-8 h-8 md:w-10 md:h-10' : 'w-5 h-5 md:w-6 md:h-6';
  const gapClass = large ? 'gap-x-4 gap-y-4 md:gap-x-6 md:gap-y-6' : 'gap-x-3 gap-y-3';

  return (
    <div className={`grid grid-cols-2 ${gapClass} p-4 bg-surface-soft/50 rounded-xl border border-surface-border inline-flex items-center justify-center`} role="img" aria-label={description}>
      {positions.map((v, i) => (
        <div
          key={i}
          className={`${sizeClass} rounded-full transition-all duration-300 ${Boolean(v)
            ? 'bg-primary border-transparent shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110'
            : 'bg-surface border-2 border-surface-border opacity-40 shadow-inner'
            }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
