export default function WeeklyProgressChart({ weekly = [] }) {
  const maxCompleted = Math.max(...weekly.map((d) => d.completed || 0), 4)
  const totalCompletedThisWeek = weekly.reduce((sum, d) => sum + (d.completed || 0), 0)

  return (
    <section className="dashboard-card weekly-progress-card" aria-labelledby="weekly-progress-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">7-Day Matrix</span>
        <div className="weekly-heading-row">
          <h3 id="weekly-progress-title">Weekly Exercise Activity</h3>
          <span className="weekly-total-badge">
            <strong>{totalCompletedThisWeek}</strong> {totalCompletedThisWeek === 1 ? 'exercise' : 'exercises'} this week
          </span>
        </div>
      </div>

      <div className="weekly-bars-container">
        {weekly.map((dayItem) => {
          const heightPercent = maxCompleted > 0 ? Math.min(100, Math.round((dayItem.completed / maxCompleted) * 100)) : 0
          const hasCompleted = dayItem.completed > 0

          return (
            <div
              key={dayItem.date}
              className={`weekly-bar-column ${dayItem.isToday ? 'is-today' : ''} ${hasCompleted ? 'has-data' : 'empty-day'}`}
            >
              <div className="bar-count-label">
                <strong>{dayItem.completed}</strong>
              </div>

              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${Math.max(6, heightPercent)}%` }}
                  title={`${dayItem.day} (${dayItem.date}): ${dayItem.completed} completed`}
                />
              </div>

              <div className="bar-day-labels">
                <span className="day-name-short">{dayItem.dayShort}</span>
                {dayItem.isToday && <span className="today-dot-pill">Today</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="weekly-card-footer">
        <span className="weekly-legend-hint">
          💡 Consistent daily movement promotes optimal tendon remodeling and muscle memory.
        </span>
      </div>
    </section>
  )
}
