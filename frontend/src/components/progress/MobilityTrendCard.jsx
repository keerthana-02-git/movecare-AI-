function getMobilityBadgeClass(status) {
  if (status === 'Optimal') return 'optimal'
  if (status === 'Stable') return 'stable'
  return 'warning'
}

export default function MobilityTrendCard({ mobilityTrend }) {
  const hasData = mobilityTrend?.averageMobility !== null && mobilityTrend?.history?.length > 0
  const averageMobility = mobilityTrend?.averageMobility
  const latestMobility = mobilityTrend?.latestMobility
  const history = mobilityTrend?.history || []
  const mobilityStatus = mobilityTrend?.mobilityStatus || 'Stable'

  const recentEntries = history.slice(-5).reverse()

  return (
    <section className="dashboard-card mobility-trend-card" aria-labelledby="mobility-trend-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Functional Range</span>
        <div className="mobility-heading-row">
          <h3 id="mobility-trend-title">Mobility & Movement Index</h3>
          {hasData && (
            <span className={`mobility-status-badge ${getMobilityBadgeClass(mobilityStatus)}`}>
              Status: {mobilityStatus}
            </span>
          )}
        </div>
      </div>

      {hasData ? (
        <div className="mobility-card-body">
          {/* Headline Numbers */}
          <div className="mobility-stats-row">
            <div className="mobility-stat-tile">
              <span className="stat-label">Average Mobility</span>
              <div className="stat-num-group">
                <strong className="stat-big-val">{averageMobility}</strong>
                <span className="stat-scale">/ 100</span>
              </div>
              <small className="stat-hint">Range of motion index</small>
            </div>

            <div className="mobility-stat-tile">
              <span className="stat-label">Latest Check-in</span>
              <div className="stat-num-group">
                <strong className="stat-big-val">{latestMobility}</strong>
                <span className="stat-scale">/ 100</span>
              </div>
              <small className="stat-hint">Most recent session score</small>
            </div>
          </div>

          {/* Chronological History Log */}
          <div className="mobility-recent-section">
            <h4 className="mobility-history-heading">Recent Mobility Check-ins</h4>
            <div className="mobility-history-list">
              {recentEntries.map((entry, idx) => (
                <div key={`${entry.date}-${idx}`} className="mobility-history-item">
                  <div className="mobility-item-meta">
                    <span className="mobility-date">{entry.date}</span>
                    <strong className="mobility-exercise-name">{entry.exerciseName}</strong>
                  </div>
                  <div className="mobility-item-score">
                    <span className="mobility-score-pill">
                      {entry.mobilityScore} / 100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mobility-empty-state">
          <span className="empty-icon" aria-hidden="true">📏</span>
          <h4>No mobility records available yet.</h4>
          <p>When you record joint mobility and motion scores during your rehabilitation routines, your progress trajectory will appear here.</p>
        </div>
      )}
    </section>
  )
}
