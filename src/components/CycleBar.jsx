import { useState } from 'react'

// Performance cycles are anchored to this start date (28 Jun 2026). The bar
// shows the active Weekly / Monthly / Yearly period containing "today", with a
// live elapsed % and days-remaining readout.
const ANCHOR = new Date('2026-06-28T00:00:00')
const DAY = 1000 * 60 * 60 * 24

const TYPES = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]

const addMonths = (d, n) => {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}
const addYears = (d, n) => {
  const x = new Date(d)
  x.setFullYear(x.getFullYear() + n)
  return x
}
const fmt = (d, opts) => d.toLocaleDateString('en-US', opts)

// Returns the active period (containing `now`) for the given cycle type,
// rolling forward from the anchor.
function periodFor(type, now) {
  let start = new Date(ANCHOR)

  if (type === 'weekly') {
    if (now > start) {
      const weeks = Math.floor((now - start) / (7 * DAY))
      start = new Date(start.getTime() + weeks * 7 * DAY)
    }
    const end = new Date(start.getTime() + 7 * DAY)
    return {
      start,
      end,
      tag: `Week of ${fmt(start, { month: 'short', day: 'numeric' })}`,
      range: `${fmt(start, { month: 'short', day: 'numeric' })} → ${fmt(end, { month: 'short', day: 'numeric' })}`,
    }
  }

  if (type === 'monthly') {
    if (now > start) {
      while (addMonths(start, 1) <= now) start = addMonths(start, 1)
    }
    const end = addMonths(start, 1)
    return {
      start,
      end,
      tag: fmt(start, { month: 'short', year: 'numeric' }),
      range: `${fmt(start, { month: 'short', day: 'numeric' })} → ${fmt(end, { month: 'short', day: 'numeric' })}`,
    }
  }

  // yearly
  if (now > start) {
    while (addYears(start, 1) <= now) start = addYears(start, 1)
  }
  const end = addYears(start, 1)
  return {
    start,
    end,
    tag: `FY ${start.getFullYear()}`,
    range: `${fmt(start, { month: 'short', year: 'numeric' })} → ${fmt(end, { month: 'short', year: 'numeric' })}`,
  }
}

export default function CycleBar() {
  const [type, setType] = useState('monthly')
  const now = new Date()
  const { start, end, tag, range } = periodFor(type, now)

  const total = end - start
  const elapsed = Math.min(Math.max(now - start, 0), total)
  const fill = Math.round((elapsed / total) * 100)
  const daysLeft = Math.max(0, Math.ceil((end - now) / DAY))

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="pill bg-[#e8f0fe] text-[#1a73e8]">{tag}</span>
          <span className="text-sm font-semibold text-ink">Performance cycle</span>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-[#f1f3f4] p-0.5">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                type === t.key ? 'bg-white text-brand shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-xs font-medium text-ink-muted">
        <span>{range}</span>
        <span className="font-semibold text-ink">{daysLeft} days left</span>
      </div>

      <div className="relative h-2.5 rounded-full bg-[#f1f3f4] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-[#7b2fff] transition-all duration-700"
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-ink-faint">
        <span>Cycle start</span>
        <span className="text-brand font-semibold">{fill}% elapsed</span>
        <span>Cycle end</span>
      </div>
    </div>
  )
}
