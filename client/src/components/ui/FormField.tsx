import type { ReactNode } from 'react'

export interface FormFieldChildProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

interface FormFieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: (props: FormFieldChildProps) => ReactNode
}

function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="font-body text-text-default">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="font-body text-text-muted mt-1">
          {hint}
        </p>
      ) : null}
      <div className="mt-1">
        {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="font-body text-error mt-1">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FormField
