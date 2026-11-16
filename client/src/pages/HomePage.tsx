import { ShieldCheck } from 'lucide-react'

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page p-4 text-center">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-10 text-brand-accent" aria-hidden="true" />
        <h1 className="font-display text-4xl font-bold text-brand-dark">Peephole</h1>
      </div>
      <p className="font-body max-w-md text-lg text-text-default">Secure remote property visits</p>
    </main>
  )
}

export default HomePage
