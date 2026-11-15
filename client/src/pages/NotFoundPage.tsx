import Link from '../components/ui/Link'

function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page p-4 text-center">
      <h1 className="font-display text-3xl font-bold text-brand-dark">Page not found</h1>
      <p className="font-body text-lg text-text-default">
        The page you are looking for does not exist.
      </p>
      <Link to="/">Go to the home page</Link>
    </main>
  )
}

export default NotFoundPage
