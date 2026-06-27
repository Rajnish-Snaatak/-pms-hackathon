function colorFor(value) {
  if (value >= 80) return '#34a853'
  if (value >= 50) return '#f29900'
  if (value >= 1) return '#4285f4'
  return '#dadce0'
}

export default function ProgressBar({ value = 0, showLabel = false, height = 8 }) {
  const v = Math.max(0, Math.min(100, value))
  const color = colorFor(v)
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex-1 rounded-full bg-[#f1f3f4] overflow-hidden"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>
          {v}%
        </span>
      )}
    </div>
  )
}
