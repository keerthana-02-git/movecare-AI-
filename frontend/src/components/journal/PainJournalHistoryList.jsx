import { useState } from 'react'

function getPainClass(val) {
  const n = Number(val)
  if (n === 0) return 'none'
  if (n <= 3) return 'mild'
  if (n <= 6) return 'moderate'
  return 'severe'
}

function getMobilityDesc(val) {
  switch (Number(val)) {
    case 1: return 'Very Limited'
    case 2: return 'Limited'
    case 3: return 'Moderate'
    case 4: return 'Good'
    case 5: return 'Excellent'
    default: return `${val || '--'} / 5`
  }
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PainJournalHistoryList({
  entries = [],
  onEdit,
  onDelete,
  onAddNew,
  deletingId = null,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const handleDeleteClick = (entryId) => {
    setConfirmDeleteId(entryId)
  }

  const handleConfirmDelete = (entryId) => {
    onDelete(entryId)
    setConfirmDeleteId(null)
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="journal-history-empty-state">
        <span className="empty-icon" aria-hidden="true">📖</span>
        <h4>No Journal Entries Recorded Yet</h4>
        <p>Start logging your daily pain, mobility, and recovery sensations to build your clinical timeline.</p>
        {onAddNew && (
          <button type="button" className="primary-btn small" onClick={onAddNew}>
            + Log Your First Entry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="journal-history-stream">
      {entries.map((entry) => {
        const isConfirming = confirmDeleteId === entry._id
        const isDeletingThis = deletingId === entry._id

        return (
          <article key={entry._id} className="journal-history-card">
            <div className="history-card-header">
              <div className="history-date-group">
                <span className="history-calendar-icon" aria-hidden="true">📅</span>
                <strong className="history-date-str">
                  {formatDateDisplay(entry.dateString || entry.date)}
                </strong>
                <span className="history-bodypart-badge">{entry.bodyPart || 'General'}</span>
              </div>

              <div className="history-actions-row">
                <button
                  type="button"
                  className="history-action-btn edit"
                  onClick={() => onEdit(entry)}
                  title="Edit this entry"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className="history-action-btn delete"
                  onClick={() => handleDeleteClick(entry._id)}
                  disabled={isDeletingThis}
                  title="Delete this entry"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Confirm Delete Warning Banner */}
            {isConfirming && (
              <div className="delete-confirm-banner" role="alert">
                <span>Are you sure you want to remove this journal entry?</span>
                <div className="confirm-btn-row">
                  <button
                    type="button"
                    className="danger-btn-mini"
                    onClick={() => handleConfirmDelete(entry._id)}
                    disabled={isDeletingThis}
                  >
                    {isDeletingThis ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn-mini"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Scores Dual Row */}
            <div className="history-scores-row">
              <div className={`history-score-chip pain ${getPainClass(entry.painLevel)}`}>
                <span className="score-label">Pain:</span>
                <strong className="score-val">{entry.painLevel} / 10</strong>
                <span className="score-desc">
                  ({entry.painLevel === 0 ? 'None' : entry.painLevel <= 3 ? 'Mild' : entry.painLevel <= 6 ? 'Moderate' : 'Severe'})
                </span>
              </div>

              <div className="history-score-chip mobility">
                <span className="score-label">Mobility:</span>
                <strong className="score-val">{entry.mobilityLevel} / 5</strong>
                <span className="score-desc">({getMobilityDesc(entry.mobilityLevel)})</span>
              </div>
            </div>

            {/* Symptoms Chips */}
            {Array.isArray(entry.symptoms) && entry.symptoms.length > 0 && (
              <div className="history-symptoms-row">
                <span className="symptoms-lead">Symptoms:</span>
                <div className="symptoms-chips-container">
                  {entry.symptoms.map((sym) => (
                    <span key={sym} className="history-symptom-tag">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div className="history-notes-box">
                <p className="history-notes-text">&ldquo;{entry.notes}&rdquo;</p>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
