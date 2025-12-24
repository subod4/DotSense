import { Children, cloneElement, isValidElement, useId } from 'react'

export default function Field({ label, children, id, hint, error, required }) {
  const autoId = useId()
  const controlId = id || `field-${autoId}`
  const hintId = hint ? `${controlId}__hint` : undefined
  const errorId = error ? `${controlId}__error` : undefined

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const child = Children.only(children)
  const resolvedId = child?.props?.id ?? controlId
  const controlProps = {
    id: resolvedId,
    'aria-describedby': child?.props?.['aria-describedby'] ?? describedBy,
    'aria-invalid': child?.props?.['aria-invalid'] ?? (error ? true : undefined),
    required: child?.props?.required ?? required,
  }

  return (
    <div className="field">
      <label htmlFor={resolvedId}>
        {label}
        {required ? <span className="srOnly"> (required)</span> : null}
      </label>
      {isValidElement(child) ? cloneElement(child, controlProps) : child}
      {hint ? (
        <small id={hintId} className="muted">
          {hint}
        </small>
      ) : null}
      {error ? (
        <div id={errorId} className="fieldError" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
    </div>
  )
}
