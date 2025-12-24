export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 z-50" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-full border-4 border-surface-border border-t-primary animate-spin" aria-hidden="true" />
      <p className="text-text-muted font-medium animate-pulse">Loading...</p>
    </div>
  )
}
