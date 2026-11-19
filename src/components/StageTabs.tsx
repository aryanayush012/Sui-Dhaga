'use client'
export type Tab = { id: string; label: string; count: number }

export function StageTabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={tab.id === active} onClick={() => onChange(tab.id)}
          className={`min-h-11 shrink-0 snap-start rounded-full border px-4 ${tab.id === active ? 'border-accent bg-accent font-bold text-white' : 'border-line bg-white'}`}>
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  )
}
