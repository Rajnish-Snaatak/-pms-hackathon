import Badge from './Badge'

const TYPE_META = {
  progress: { color: '#34a853', variant: 'green', label: 'Progress' },
  achievement: { color: '#f29900', variant: 'yellow', label: 'Achievement' },
  checkin: { color: '#4285f4', variant: 'blue', label: 'Check-in' },
  evidence: { color: '#e8710a', variant: 'orange', label: 'Evidence' },
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TimelineItem({ event, goalTitle, isLast = false }) {
  const meta = TYPE_META[event.type] || TYPE_META.progress

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className="mt-1.5 h-3 w-3 rounded-full ring-4 ring-white shrink-0"
          style={{ background: meta.color }}
        />
        {!isLast && <span className="w-px flex-1 bg-line my-1" />}
      </div>

      <div className={`flex-1 ${isLast ? '' : 'pb-5'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {goalTitle && (
            <span className="text-[11px] font-medium text-ink-faint">
              ↳ {goalTitle}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-ink leading-snug">{event.text}</p>
        <p className="mt-1 text-[11px] text-ink-faint">
          {event.added_by}
          {event.added_by_role && (
            <span className="text-ink-faint"> · {event.added_by_role}</span>
          )}
          {' · '}
          {fmtDate(event.created_at)}
        </p>
      </div>
    </div>
  )
}
