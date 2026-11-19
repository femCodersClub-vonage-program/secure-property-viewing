import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export type TabItem = { id: string; label: string }

type TabsProps = {
  label: string
  tabs: TabItem[]
  selectedId: string
  onSelect: (id: string) => void
  children: ReactNode
}

function Tabs({ label, tabs, selectedId, onSelect, children }: TabsProps) {
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = `${baseId}-panel`

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      default:
        return
    }
    event.preventDefault()
    const nextTab = tabs[next]
    if (nextTab === undefined) return
    onSelect(nextTab.id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-6 border-b border-border">
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedId
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`-mb-px border-b-4 px-1 py-3 font-body text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                selected
                  ? 'border-brand-primary font-bold text-text-default'
                  : 'border-transparent text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(selectedId)}
        tabIndex={0}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  )
}

export default Tabs
