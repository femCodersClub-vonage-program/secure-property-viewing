// Says in text which row is the next visit, so the highlighted row does not rely on color alone
function NextLabel() {
  return (
    <span className="rounded-sm bg-dashboard-highlight px-2 py-0.5 text-xs font-bold text-brand-dark">
      Next
    </span>
  )
}

export default NextLabel
