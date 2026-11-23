import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentPropsWithRef } from 'react'
import { Input } from '../../../components/ui'

// The shared Input with a button to show the password. `type` is left out: this component decides it
type PasswordInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'>

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false)

  return (
    <div className="relative">
      {/* pr-12 leaves room for the button, so the text never goes under the eye */}
      <Input {...props} type={shown ? 'text' : 'password'} className={`pr-12 ${className ?? ''}`} />
      {/* A fixed name with aria-pressed: screen readers announce "Show password, pressed" */}
      <button
        type="button"
        aria-label="Show password"
        aria-pressed={shown}
        aria-controls={props.id}
        onClick={() => setShown((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-sm text-text-muted hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-brand-primary"
      >
        {shown ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  )
}

export default PasswordInput
