import { NavLink } from 'react-router-dom'

function formatDate(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

export default function ProgressSummary({ progressSummary }) {
  const overallPercentage = typeof progressSummary?.overallProgressPercentage === 'number'
    ? progressSummary.overallProgressPercentage
    : (typeof progressSummary?.completionRate === 'number' ? progressSummary.completionRate : 0)

  const completedSessions = progressSummary?.completedSessions ?? 0
  const totalSessions = progressSummary?.totalSessions ?? 0
  const averagePain = progressSummary?.averagePain
  const averageMobility = progressSummary?.averageMobility
  const mobilityStatus = progressSummary?.mobilityStatus || (averagePain === null || averagePain === undefined ? 'Awaiting check-in' : (averagePain <= 3 ? 'Stable' : 'Needs attention'))
  const recentEntries = Array.isArray(progressSummary?.recentEntries) ? progressSummary.recentEntries : []

  const hasProgress = totalSessions > 0 || recentEntries.length > 0

  return (
    <section className="dashboard-card progress-summary-card" aria-labelledby="progress-summary-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Clinical Signals</span>
        <div className="progress-heading-row">
          <h3 id="progress-summary-title">Progress Summary</h3>
          <span className={`mobility-status-pill ${mobilityStatus === 'Needs attention' ? 'warning' : (mobilityStatus === 'Stable' ? 'stable' : 'neutral')}`}>
            {mobilityStatus}
          </span>
        </div>
      </div>

      {hasProgress ? (
        <div className="progress-summary-body">
          <div className="signals-metrics-grid">
            <div className="signal-metric-box">
              <span className="signal-box-label">Completed Sessions</span>
              <strong className="signal-box-val">{completedSessions}</strong>
              <small className="signal-box-sub">of {totalSessions} total logged</small>
            </div>

            <div className="signal-metric-box">
              <span className="signal-box-label">Average Pain</span>
              <strong className="signal-box-val">
                {averagePain === null || averagePain === undefined ? '--' : `${averagePain}`}
                <span className="val-unit">/10</span>
              </strong>
              <small className="signal-box-sub">
                {averagePain !== null && averagePain !== undefined
                  ? (averagePain <= 3 ? 'Mild / Manageable' : 'Elevated pain level')
                  : 'No pain ratings yet'}
              </small>
            </div>

            <div className="signal-metric-box">
              <span className="signal-box-label">Mobility Index</span>
              <strong className="signal-box-val">
                {averageMobility === null || averageMobility === undefined ? '--' : `${averageMobility}`}
                <span className="val-unit">/100</span>
              </strong>
              <small className="signal-box-sub">
                {averageMobility !== null && averageMobility !== undefined
                  ? 'Functional movement score'
                  : 'Awaiting mobility check'}
              </small>
            </div>

            <div className="signal-metric-box">
              <span className="signal-box-label">Adherence Rate</span>
              <strong className="signal-box-val highlight">{overallPercentage}%</strong>
              <small className="signal-box-sub">overall compliance</small>
            </div>
          </div>

          {recentEntries.length > 0 && (
            <div className="recent-sessions-section">
              <h4 className="recent-sessions-heading">Recent Exercise Logs</h4>
              <div className="recent-sessions-list">
                {recentEntries.map((entry, index) => {
                  const exerciseName = entry.exercise?.name || 'Rehabilitation Exercise'
                  const dateStr = formatDate(entry.datePerformed || entry.createdAt)
                  const pain = entry.painLevel !== undefined && entry.painLevel !== null ? `Pain: ${entry.painLevel}/10` : null
                  const reps = entry.repsCompleted ? `${entry.repsCompleted} reps` : null
                  const entryId = entry._id || `entry-${index}`

                  return (
                    <div className="recent-session-row" key={entryId}>
                      <span className="session-bullet" aria-hidden="true" />
                      <div className="session-row-info">
                        <strong className="session-exercise-name">{exerciseName}</strong>
                        <span className="session-meta">
                          {dateStr}
                          {reps && ` · ${reps}`}
                          {pain && ` · ${pain}`}
                        </span>
                      </div>
                      <span className="session-status-tag">{entry.completionStatus || 'Completed'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="progress-card-footer">
            <NavLink to="/progress" className="view-progress-link">
              View Comprehensive Recovery Charts & Logs →
            </NavLink>
          </div>
        </div>
      ) : (
        <div className="empty-progress-state">
          <span className="empty-state-icon" aria-hidden="true">📈</span>
          <h4>No Recovery Progress Logged Yet</h4>
          <p>
            As you perform your assigned exercises and check-ins, your pain metrics, mobility scores, and session completion will automatically update here.
          </p>
          <NavLink to="/my-exercises" className="secondary-btn small">
            Start Your First Exercise
          </NavLink>
        </div>
      )}
    </section>
  )
}
