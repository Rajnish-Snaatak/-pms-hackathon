export default function ScoreRing({ score = 0, size = 140, label = 'Readiness' }) {
  const v = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = 12
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (v / 100) * circ

  const color = v >= 80 ? '#34a853' : v >= 50 ? '#f29900' : '#d93025'
  const verdict = v >= 80 ? 'On track' : v >= 50 ? 'Needs focus' : 'At risk'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f3f4"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold" style={{ color }}>
            {v}
          </span>
          <span className="text-[11px] font-medium text-ink-muted">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold text-ink">{label}</span>
      <span className="text-xs font-medium" style={{ color }}>
        {verdict}
      </span>
    </div>
  )
}

// Score formula shared across dashboards.
export function computeScore({ approvedGoals = 0, events = 0, avgProgress = 0 }) {
  return Math.min(
    100,
    Math.round(approvedGoals * 15 + events * 5 + avgProgress * 0.2)
  )
}
