export default function ErrorBanner({ error }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  return (
    <div className="error" role="alert" aria-live="assertive" aria-atomic="true">
      {message}
    </div>
  )
}
