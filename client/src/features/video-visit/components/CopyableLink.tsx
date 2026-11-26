import { Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, FormField, Input } from '../../../components/ui'

type Props = {
  id: string
  label: string
  url: string
  copyLabel: string
  buttonVariant: 'primary' | 'secondary'
  /** Moves the focus to the link when it replaces the button that created it. */
  focusOnShow?: boolean
}

type CopyResult = 'none' | 'copied' | 'selected'

function CopyableLink({ id, label, url, copyLabel, buttonVariant, focusOnShow = false }: Props) {
  const [result, setResult] = useState<CopyResult>('none')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusOnShow) {
      inputRef.current?.focus()
    }
  }, [focusOnShow])

  async function copy() {
    // Cleared first, so copying again announces the message again
    setResult('none')
    try {
      // The clipboard only exists on HTTPS and localhost, and the browser can refuse it
      if (typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('No clipboard')
      }
      await navigator.clipboard.writeText(url)
      setResult('copied')
    } catch {
      inputRef.current?.focus()
      inputRef.current?.select()
      setResult('selected')
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto] sm:items-end sm:gap-2">
      <FormField id={id} label={label}>
        {(props) => (
          <Input
            {...props}
            ref={inputRef}
            readOnly
            className="min-h-12"
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </FormField>
      <Button variant={buttonVariant} onClick={() => void copy()} className="min-h-12">
        <Copy aria-hidden="true" className="size-5" />
        {copyLabel}
      </Button>
      <p role="status" className="font-body text-sm min-h-5 text-text-default sm:col-span-2">
        {result === 'copied'
          ? 'Copied.'
          : result === 'selected'
            ? "The link is selected: copy it with your device's copy option."
            : null}
      </p>
    </div>
  )
}

export default CopyableLink
