export default function RecoveryOverview({ recovery }) {
  const completionPercentage = typeof recovery?.completionPercentage === 'number'
    ? recovery.completionPercentage
    : (typeof recovery?.completionRate === 'number' ? recovery.completionRate : 0)

  const totalAssigned = recovery?.totalAssignedExercises ?? 0
  const completed = recovery?.completedExercises ?? 0
  const remaining = recovery?.remainingExercises ?? Math.max(0, totalAssigned - completed)
  const currentStreak = recovery?.currentStreak ?? 0
  const activePlansCount = recovery?.activePlansCount ?? 0

  return (
    <section className="dashboard-card recovery-overview-card" aria-labelledby="recovery-overview-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Program Adherence</span>
        <div className="recovery-heading-row">
          <h3 id="recovery-overview-title">Recovery Overview</h3>
          <span className="streak-badge" title="Consecutive days with completed recovery exercises">
            <span className="streak-flame" aria-hidden="true">🔥</span>
            <strong>{currentStreak}</strong> {currentStreak === 1 ? 'day streak' : 'days streak'}
          </span>
        </div>
      </div>

      <div className="recovery-headline-stat">
        <div className="headline-number-wrap">
          <strong className="recovery-big-pct">{completionPercentage}%</strong>
          <span className="recovery-pct-label">overall plan completion</span>
        </div>
        <div className="active-plans-pill">
          <strong>{activePlansCount}</strong> {activePlansCount === 1 ? 'active plan' : 'active plans'}
        </div>
      </div>

      <div
        className="recovery-progress-bar"
        role="progressbar"
        aria-valuenow={completionPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completionPercentage}% overall exercise completion`}
      >
        <div
          className="recovery-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
        />
      </div>

      <div className="recovery-metrics-grid">
        <div className="recovery-metric-tile total">
          <span className="metric-label">Total Assigned</span>
          <strong className="metric-val">{totalAssigned}</strong>
          <small className="metric-sub">exercises in active plan</small>
        </div>

        <div className="recovery-metric-tile completed">
          <span className="metric-label">Completed</span>
          <strong className="metric-val">{completed}</strong>
          <small className="metric-sub">exercises finished</small>
        </div>

        <div className="recovery-metric-tile remaining">
          <span className="metric-label">Remaining</span>
          <strong className="metric-val">{remaining}</strong>
          <small className="metric-sub">exercises pending</small>
        </div>
      </div>

      {totalAssigned === 0 && (
        <p className="recovery-empty-note">
          No exercises have been assigned to your active plan yet. Once assigned by your therapist, completion will update automatically.
        </p>
      )}
    </section>
  )
}
