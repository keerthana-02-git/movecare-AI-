export default function ProgressOverviewCard({ overview }) {
  const totalAssigned = overview?.totalAssigned ?? 0
  const completed = overview?.completed ?? 0
  const remaining = overview?.remaining ?? Math.max(0, totalAssigned - completed)
  const completionPercentage = overview?.completionPercentage ?? 0
  const currentStreak = overview?.currentStreak ?? 0
  const bestStreak = overview?.bestStreak ?? currentStreak
  const weeklyRate = overview?.weeklyCompletionPercentage ?? 0
  const monthlyRate = overview?.monthlyCompletionPercentage ?? 0

  return (
    <section className="dashboard-card progress-overview-card" aria-labelledby="progress-overview-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Recovery Analytics</span>
        <div className="overview-heading-row">
          <h3 id="progress-overview-title">Recovery Progress Overview</h3>
          <div className="streak-badges-cluster">
            <span className="streak-badge fire-active" title="Current continuous workout streak">
              <span className="streak-flame-icon" aria-hidden="true">🔥</span>
              <span>Current Streak: <strong>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</strong></span>
            </span>
            {bestStreak > 0 && (
              <span className="streak-badge best-trophy" title="All-time longest workout streak">
                <span className="streak-trophy-icon" aria-hidden="true">🏆</span>
                <span>Best: <strong>{bestStreak} {bestStreak === 1 ? 'day' : 'days'}</strong></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Headline Progress Bar */}
      <div className="overview-headline-stat">
        <div className="headline-number-wrap">
          <span className="overview-big-pct">{completionPercentage}%</span>
          <span className="overview-pct-label">Overall Plan Adherence</span>
        </div>
        <div className="overview-sub-rates">
          <span className="rate-pill weekly">Weekly: <strong>{weeklyRate}%</strong></span>
          <span className="rate-pill monthly">Monthly: <strong>{monthlyRate}%</strong></span>
        </div>
      </div>

      <div className="overview-progress-bar" role="progressbar" aria-valuenow={completionPercentage} aria-valuemin="0" aria-valuemax="100">
        <div
          className="overview-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
        />
      </div>

      {/* 3 Metrics Grid */}
      <div className="overview-metrics-grid">
        <article className="overview-metric-tile total">
          <span className="metric-label">Total Assigned</span>
          <strong className="metric-val">{totalAssigned}</strong>
          <span className="metric-sub">Prescribed exercises</span>
        </article>

        <article className="overview-metric-tile completed">
          <span className="metric-label">Completed</span>
          <strong className="metric-val">{completed}</strong>
          <span className="metric-sub">Sessions finished</span>
        </article>

        <article className="overview-metric-tile remaining">
          <span className="metric-label">Remaining</span>
          <strong className="metric-val">{remaining}</strong>
          <span className="metric-sub">Pending routine</span>
        </article>
      </div>
    </section>
  )
}
