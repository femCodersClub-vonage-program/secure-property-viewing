import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: LucideIcon
  title: string
  children: ReactNode
}

// A group of fields with its title: the fieldset tells screen readers which group they are in
function FormSection({ icon: Icon, title, children }: Props) {
  return (
    <div className="border-t border-border pt-6">
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 flex items-center gap-3 font-display text-xl font-bold text-brand-dark">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-pill bg-brand-primary/10 text-brand-primary"
          >
            <Icon className="size-5" />
          </span>
          {title}
        </legend>
        {children}
      </fieldset>
    </div>
  )
}

export default FormSection
