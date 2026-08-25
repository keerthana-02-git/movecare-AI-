function formatTimeAgo(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(d)
  } catch {
    return ''
  }
}

export default function ExerciseCard({ item, onOpenDetail, onQuickComplete }) {
  const ex = item?.exercise || {}
  const isCompleted = Boolean(item?.isCompletedToday)
  const duration = ex.duration || 10
  const sets = ex.sets || 3
  const reps = ex.reps || 10
  const category = ex.category || 'Strengthening'
  const difficulty = ex.difficulty || 'Medium'
  const bodyPart = ex.targetBodyPart || 'Full Body'
  const hasVideo = Boolean(ex.videoUrl && ex.videoUrl.trim())
  const hasImage = Boolean(ex.imageUrl && ex.imageUrl.trim())

  return (
    <article
      className={`personalized-exercise-card ${isCompleted ? 'is-completed' : 'is-pending'}`}
      aria-labelledby={`exercise-card-title-${ex._id || 'card'}`}
    >
      <div className="card-top-row">
        <div className="card-category-cluster">
          {item.planName && <span className="card-plan-tag">{item.planName}</span>}
          <span className="card-category-tag">{category}</span>
        </div>
        <span className={`card-difficulty-tag ${difficulty.toLowerCase()}`}>
          {difficulty}
        </span>
      </div>

      <div className="card-main-header">
        <h3 id={`exercise-card-title-${ex._id || 'card'}`} className="card-exercise-name">
          {ex.name || 'Assigned Exercise'}
        </h3>
        {isCompleted ? (
          <span className="card-status-badge complete" title="Completed for today">
            <span className="badge-check-icon" aria-hidden="true">✓</span> Done Today
          </span>
        ) : (
          <span className="card-status-badge pending">
            Pending
          </span>
        )}
      </div>

      <p className="card-exercise-desc">
        {ex.description || 'Guided rehabilitation exercise designed by your physical therapy care team.'}
      </p>

      <div className="card-spec-grid">
        <div className="card-spec-pill">
          <span className="spec-icon" aria-hidden="true">🎯</span>
          <span className="spec-text">{bodyPart}</span>
        </div>
        <div className="card-spec-pill">
          <span className="spec-icon" aria-hidden="true">⏱</span>
          <span className="spec-text">{duration} min</span>
        </div>
        <div className="card-spec-pill">
          <span className="spec-icon" aria-hidden="true">🔢</span>
          <span className="spec-text">{sets} sets × {reps} reps</span>
        </div>
        {item.frequency && (
          <div className="card-spec-pill">
            <span className="spec-icon" aria-hidden="true">📅</span>
            <span className="spec-text">{item.frequency}</span>
          </div>
        )}
      </div>

      {/* Media indicators */}
      <div className="card-media-indicators">
        {hasVideo && <span className="media-badge video">📹 Video Demonstration</span>}
        {hasImage && <span className="media-badge image">🖼️ Visual Diagram</span>}
        {!hasVideo && !hasImage && <span className="media-badge step">📋 Step Instructions</span>}
      </div>

      {isCompleted && item.painLevel !== undefined && item.painLevel !== null && (
        <div className="card-completed-meta">
          <span>Reported Pain: <strong>{item.painLevel}/10</strong></span>
          {item.completedAt && <small>Completed at {formatTimeAgo(item.completedAt)}</small>}
        </div>
      )}

      <div className="card-actions-row">
        <button
          type="button"
          className="primary-btn small start-exercise-action"
          onClick={() => onOpenDetail(item)}
        >
          {isCompleted ? 'Review & Practice Again →' : 'Start Guided Exercise →'}
        </button>

        {!isCompleted && onQuickComplete && (
          <button
            type="button"
            className="secondary-btn small quick-complete-action"
            onClick={() => onQuickComplete(item)}
            title="Log completion with pain level"
          >
            ✓ Mark Done
          </button>
        )}
      </div>
    </article>
  )
}
