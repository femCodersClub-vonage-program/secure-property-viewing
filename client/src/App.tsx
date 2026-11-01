import { ShieldCheck } from 'lucide-react'

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4 text-center">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-10 text-emerald-800" aria-hidden="true" />
        <h1 className="text-4xl font-bold text-slate-900">Peephole</h1>
      </div>
      <p className="max-w-md text-lg text-slate-700">Secure remote property visits</p>
    </main>
  )
}

export default App
