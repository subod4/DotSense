export default function JsonView({ value, label = 'JSON output' }) {
  return (
    <pre className="json" tabIndex={0} aria-label={label}>
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
