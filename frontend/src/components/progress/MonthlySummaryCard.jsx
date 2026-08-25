export default function MonthlySummaryCard({ monthly }) {
  const completedThisMonth = monthly?.completedThisMonth ?? 0
  const activeDays = monthly?.activeDays ?? 0
  const averagePerActiveDay = monthly?.averagePerActiveDay ?? 0
  const completionPercentage = monthly?.completionPercentage ?? 0
  const monthName = monthly?.monthName || 'Current Month'
  const year = monthly?.year || new Date().getFullYear()

  return (
    <section className="dashboard-card monthly-summary-card" aria-labelledby="monthly-summary-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Monthly Snapshot</span>
        <div className="monthly-heading-row">
          <h3 id="monthly-summary-title">{monthName} {year} Recovery Summary</h3>
          <span className="monthly-month-pill">{monthName}</span>
        </div>
      </div>

      <div className="monthly-metrics-grid">
        <div className="monthly-metric-box">
          <span className="box-icon" aria-hidden="true">🏋️</span>
          <div className="box-text-content">
            <span className="box-label">Completed This Month</span>
            <strong className="box-value">{completedThisMonth}</strong>
            <small className="box-sub">Total exercise logs</small>
          </div>
        </div>

        <div className="monthly-metric-box">
          <span className="box-icon" aria-hidden="true">📅</span>
          <div className="box-text-content">
            <span className="box-label">Active Workout Days</span>
            <strong className="box-value">{activeDays}</strong>
            <small className="box-sub">Distinct active dates</small>
          </div>
        </div>

        <div className="monthly-metric-box">
          <span className="box-icon" aria-hidden="true">⚡</span>
          <div className="box-text-content">
            <span className="box-label">Avg. Per Active Day</span>
            <strong className="box-value">{averagePerActiveDay}</strong>
            <small className="box-sub">Exercises per session</small>
          </div>
        </div>

        <div className="monthly-metric-box highlight">
          <span className="box-icon" aria-hidden="true">📈</span>
          <div className="box-text-content">
            <span className="box-label">Monthly Consistency</span>
            <strong className="box-value">{completionPercentage}%</strong>
            <small className="box-sub">Days with activity</small>
          </div>
        </div>
      </div>
    </section>
  )
}
