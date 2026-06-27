// Q3 2025 cycle: Jul 1 -> Sep 30. Fill is fixed at 68% per the design spec,
// with a live "days remaining" readout against the cycle end date.
export default function CycleBar() {
  const fill = 68
  const end = new Date('2025-09-30T23:59:59')
  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24
  const daysLeft = Math.max(0, Math.round((end - now) / msPerDay))

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="pill bg-[#e8f0fe] text-[#1a73e8]">Q3 2025</span>
          <span className="text-sm font-semibold text-ink">Performance cycle</span>
        </div>
        <span className="text-xs font-medium text-ink-muted">
          Jul 1 → Sep 30 · <span className="font-semibold text-ink">{daysLeft} days left</span>
        </span>
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
