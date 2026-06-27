export default function StatCard({ label, value, sub, subColor = '#5f6368', icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        {icon && <span className="text-lg leading-none">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-ink tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs font-medium" style={{ color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  )
}
