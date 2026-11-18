function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold text-brand-dark">{title}</h1>
      <p className="text-text-muted">This screen is coming soon.</p>
    </div>
  )
}

export default ScreenPlaceholder
