import { NavLink } from 'react-router-dom'

function getPainClass(val) {
  const n = Number(val)
  if (n === 0) return 'none'
  if (n <= 3) return 'mild'
  if (n <= 6) return 'moderate'
  return 'severe'
}

function getMobilityLabel(val) {
  const n = Number(val)
  switch (n) {
    case 1: return '1 - Very Limited'
    case 2: return '2 - Limited'
    case 3: return '3 - Moderate'
    case 4: return '4 - Good'
    case 5: return '5 - Excellent'
    default: return `${val || '--'} / 5`
  }
}

export default function PainJournalCard({ todayEntry, onOpenLogModal }) {
  const hasEntry = Boolean(todayEntry)

  return (
    <section className="dashboard-card pain-journal-dashboard-card" aria-labelledby="pain-journal-card-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Daily Sensation</span>
        <div className="journal-card-heading-row">
          <h3 id="pain-journal-card-title">Pain &amp; Mobility Journal</h3>
          <NavLink to="/pain-journal" className="card-view-all-link">
            View History →
          </NavLink>
        </div>
      </div>

      {hasEntry ? (
        <div className="journal-card-content">
          <div className="journal-today-summary-grid">
            <div className="journal-today-stat-box pain">
              <span className="journal-stat-label">Today's Pain</span>
              <div className="journal-stat-value-group">
                <strong className={`journal-stat-num ${getPainClass(todayEntry.painLevel)}`}>
                  {todayEntry.painLevel}
                </strong>
                <span className="journal-stat-denom">/ 10</span>
              </div>
              <span className={`journal-badge-pill ${getPainClass(todayEntry.painLevel)}`}>
                {todayEntry.painLevel === 0 ? 'No Pain' : todayEntry.painLevel <= 3 ? 'Mild' : todayEntry.painLevel <= 6 ? 'Moderate' : 'Severe'}
              </span>
            </div>

            <div className="journal-today-stat-box mobility">
              <span className="journal-stat-label">Today's Mobility</span>
              <div className="journal-stat-value-group">
                <strong className="journal-stat-num mobility">{todayEntry.mobilityLevel}</strong>
                <span className="journal-stat-denom">/ 5</span>
              </div>
              <span className="journal-badge-pill mobility">
                {getMobilityLabel(todayEntry.mobilityLevel).split(' - ')[1] || 'Good'}
              </span>
            </div>
          </div>

          <div className="journal-today-meta">
            <div className="journal-meta-row">
              <span className="meta-label">Body Part:</span>
              <strong className="meta-val">{todayEntry.bodyPart || 'General'}</strong>
            </div>

            {Array.isArray(todayEntry.symptoms) && todayEntry.symptoms.length > 0 && (
              <div className="journal-symptoms-chips">
                {todayEntry.symptoms.map((sym) => (
                  <span key={sym} className="symptom-chip">{sym}</span>
                ))}
              </div>
            )}

            {todayEntry.notes && (
              <p className="journal-today-notes">
                &ldquo;{todayEntry.notes}&rdquo;
              </p>
            )}
          </div>

          <div className="journal-card-actions">
            <button
              type="button"
              className="secondary-btn small full-width"
              onClick={() => onOpenLogModal(todayEntry)}
            >
              ✏️ Update Today's Check-in
            </button>
          </div>
        </div>
      ) : (
        <div className="journal-card-empty">
          <span className="journal-empty-icon" aria-hidden="true">📝</span>
          <h4>No journal entry for today</h4>
          <p>Record your daily comfort, mobility, and symptoms to track your recovery trajectory.</p>
          <button
            type="button"
            className="primary-btn small"
            onClick={() => onOpenLogModal(null)}
          >
            + Log Today's Check-in
          </button>
        </div>
      )}
    </section>
  )
}
