function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return ''
  try {
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return ''
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${formatter.format(s)} — ${formatter.format(e)}`
  } catch {
    return ''
  }
}

export default function RecoveryGoal({ recoveryGoal }) {
  const goal = recoveryGoal?.goal
  const condition = recoveryGoal?.condition
  const targetBodyPart = recoveryGoal?.targetBodyPart || (Array.isArray(recoveryGoal?.targetBodyParts) ? recoveryGoal.targetBodyParts.join(', ') : null)
  const planName = recoveryGoal?.planName
  const dateRange = formatDateRange(recoveryGoal?.planStartDate, recoveryGoal?.planEndDate)
  const notes = recoveryGoal?.notes

  const hasGoalData = Boolean(goal || condition || targetBodyPart)

  return (
    <section className="dashboard-card recovery-goal-card" aria-labelledby="recovery-goal-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Therapy Objective</span>
        <h3 id="recovery-goal-title">Recovery Goal</h3>
      </div>

      {hasGoalData ? (
        <div className="recovery-goal-content">
          {goal && (
            <div className="primary-goal-banner">
              <span className="goal-icon" aria-hidden="true">🎯</span>
              <div>
                <span className="goal-label">Current Goal</span>
                <p className="goal-text">{goal}</p>
              </div>
            </div>
          )}

          <div className="goal-attributes-grid">
            {condition && (
              <div className="goal-attribute-item">
                <span className="attribute-label">Target Condition</span>
                <strong className="attribute-val">{condition}</strong>
              </div>
            )}

            {targetBodyPart && (
              <div className="goal-attribute-item">
                <span className="attribute-label">Target Area</span>
                <strong className="attribute-val">{targetBodyPart}</strong>
              </div>
            )}

            {planName && (
              <div className="goal-attribute-item">
                <span className="attribute-label">Active Plan</span>
                <strong className="attribute-val">{planName}</strong>
                {dateRange && <small className="attribute-sub">{dateRange}</small>}
              </div>
            )}
          </div>

          {notes && (
            <div className="goal-therapist-notes">
              <strong className="notes-heading">Therapist Clinical Notes:</strong>
              <p>{notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-goal-state">
          <span className="empty-state-icon" aria-hidden="true">📋</span>
          <h4>No Recovery Goal Set Yet</h4>
          <p>
            Your care team will establish personalized recovery milestones and target rehabilitation goals once your initial assessment is complete.
          </p>
        </div>
      )}
    </section>
  )
}
