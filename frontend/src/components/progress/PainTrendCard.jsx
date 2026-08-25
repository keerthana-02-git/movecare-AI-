function getPainBadgeClass(level) {
  const num = Number(level)
  if (num === 0) return 'none'
  if (num <= 3) return 'mild'
  if (num <= 6) return 'moderate'
  return 'severe'
}

export default function PainTrendCard({ painTrend }) {
  const hasData = painTrend?.averagePain !== null && painTrend?.history?.length > 0
  const averagePain = painTrend?.averagePain
  const latestPain = painTrend?.latestPain
  const history = painTrend?.history || []
  const painSeverity = painTrend?.painSeverity || 'Mild'

  // Recent 5 entries
  const recentEntries = history.slice(-5).reverse()

  return (
    <section className="dashboard-card pain-trend-card" aria-labelledby="pain-trend-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Clinical Sensation</span>
        <div className="pain-heading-row">
          <h3 id="pain-trend-title">Pain Level Trend</h3>
          {hasData && (
            <span className={`pain-severity-pill ${getPainBadgeClass(averagePain)}`}>
              Avg Severity: {painSeverity}
            </span>
          )}
        </div>
      </div>

      {hasData ? (
        <div className="pain-card-body">
          {/* Headline Numbers */}
          <div className="pain-stats-row">
            <div className="pain-stat-tile">
              <span className="stat-label">Average Pain</span>
              <div className="stat-num-group">
                <strong className="stat-big-val">{averagePain}</strong>
                <span className="stat-scale">/ 10</span>
              </div>
              <small className="stat-hint">Across all recorded sessions</small>
            </div>

            <div className="pain-stat-tile">
              <span className="stat-label">Latest Recorded</span>
              <div className="stat-num-group">
                <strong className="stat-big-val">{latestPain}</strong>
                <span className="stat-scale">/ 10</span>
              </div>
              <small className="stat-hint">Most recent check-in</small>
            </div>
          </div>

          {/* Chronological History Log */}
          <div className="pain-recent-section">
            <h4 className="pain-history-heading">Recent Pain Level Check-ins</h4>
            <div className="pain-history-list">
              {recentEntries.map((entry, idx) => (
                <div key={`${entry.date}-${idx}`} className="pain-history-item">
                  <div className="pain-item-meta">
                    <span className="pain-date">{entry.date}</span>
                    <strong className="pain-exercise-name">{entry.exerciseName}</strong>
                    {entry.notes && <p className="pain-patient-notes">&ldquo;{entry.notes}&rdquo;</p>}
                  </div>
                  <div className="pain-item-score">
                    <span className={`pain-score-pill ${getPainBadgeClass(entry.painLevel)}`}>
                      {entry.painLevel} / 10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="pain-empty-state">
          <span className="empty-icon" aria-hidden="true">🩺</span>
          <h4>No pain records available yet.</h4>
          <p>When you complete exercises and enter your pain level (0–10), your recovery comfort curve will appear here.</p>
        </div>
      )}
    </section>
  )
}
