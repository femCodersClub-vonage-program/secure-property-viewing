import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="text-lg text-slate-700">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="rounded text-lg font-semibold text-indigo-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900"
      >
        Go to the home page
      </Link>
    </main>
  )
}

export default NotFoundPage
