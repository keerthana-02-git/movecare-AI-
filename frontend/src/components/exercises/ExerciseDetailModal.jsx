import { useEffect, useRef, useState } from 'react'

function formatTimer(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

function getPainDescription(level) {
  const num = Number(level)
  if (num === 0) return { label: 'No Pain (0/10)', desc: 'Completely comfortable during movement', color: '#10b981' }
  if (num <= 3) return { label: `Mild Discomfort (${num}/10)`, desc: 'Noticeable sensation, but easily manageable', color: '#0d8b85' }
  if (num <= 6) return { label: `Moderate Pain (${num}/10)`, desc: 'Tolerable effort, monitor joint stability', color: '#f59e0b' }
  return { label: `Severe / Sharp Pain (${num}/10)`, desc: 'Stop if sharp pain persists and inform therapist', color: '#ef4444' }
}

export default function ExerciseDetailModal({
  item,
  onClose,
  onComplete,
  submitting = false,
  submitError = '',
}) {
  const ex = item?.exercise || {}
  const planId = item?.planId
  const durationMinutes = ex.duration || 10
  const targetSeconds = durationMinutes * 60

  // Timer State
  const [seconds, setSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef(null)

  // Completion Form State
  const [painLevel, setPainLevel] = useState('2')
  const [mobilityScore, setMobilityScore] = useState('75')
  const [notes, setNotes] = useState('')
  const [showCompletionSection, setShowCompletionSection] = useState(false)

  // Timer effects
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  const handleStartTimer = () => setTimerRunning(true)
  const handlePauseTimer = () => setTimerRunning(false)
  const handleResetTimer = () => {
    setTimerRunning(false)
    setSeconds(0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ex._id) return

    await onComplete(ex._id, planId, {
      painLevel: painLevel !== '' ? Number(painLevel) : undefined,
      mobilityScore: mobilityScore !== '' ? Number(mobilityScore) : undefined,
      notes: notes.trim(),
    })
  }

  const painInfo = getPainDescription(painLevel)

  // Video embed helper
  const renderVideo = () => {
    if (!ex.videoUrl || !ex.videoUrl.trim()) return null

    const url = ex.videoUrl.trim()
    let embedUrl = null

    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('watch?v=')[1]?.split('&')[0]
      if (videoId) embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      if (videoId) embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
    } else if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
      if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`
    }

    if (embedUrl) {
      return (
        <div className="exercise-video-embed-container">
          <iframe
            src={embedUrl}
            title={`${ex.name} Video Demonstration`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }

    if (url.endsWith('.mp4') || url.endsWith('.webm')) {
      return (
        <div className="exercise-video-embed-container">
          <video controls playsInline preload="metadata">
            <source src={url} type="video/mp4" />
            Your browser does not support video playback.
          </video>
        </div>
      )
    }

    return (
      <div className="exercise-external-video-box">
        <span>📹 External Video Demonstration Available</span>
        <a href={url} target="_blank" rel="noreferrer" className="secondary-btn small">
          Watch Video in New Tab ↗
        </a>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-exercise-title">
      <div className="exercise-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="exercise-modal-header">
          <div className="header-title-block">
            <div className="modal-category-row">
              {item?.planName && <span className="modal-plan-tag">{item.planName}</span>}
              <span className="modal-category-tag">{ex.category || 'Rehabilitation'}</span>
              <span className={`modal-difficulty-pill ${ex.difficulty?.toLowerCase() || 'medium'}`}>
                {ex.difficulty || 'Medium'}
              </span>
            </div>
            <h2 id="modal-exercise-title">{ex.name || 'Guided Exercise'}</h2>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close exercise modal"
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="exercise-modal-body">
          {submitError && (
            <div className="modal-error-banner" role="alert">
              ⚠️ {submitError}
            </div>
          )}

          {/* Video or Image Presentation */}
          {renderVideo()}

          {!ex.videoUrl && ex.imageUrl && (
            <div className="exercise-image-container">
              <img src={ex.imageUrl} alt={`${ex.name} diagram`} loading="lazy" />
            </div>
          )}

          {/* Interactive Guided Timer */}
          <div className="exercise-guided-timer-box">
            <div className="timer-display-col">
              <span className="timer-label">Guided Exercise Timer</span>
              <strong className="timer-clock">{formatTimer(seconds)}</strong>
              <small className="timer-target">Recommended Duration: {durationMinutes} min ({formatTimer(targetSeconds)})</small>
            </div>
            <div className="timer-controls-col">
              {!timerRunning ? (
                <button type="button" className="primary-btn small timer-play-btn" onClick={handleStartTimer}>
                  ▶ Start Timer
                </button>
              ) : (
                <button type="button" className="secondary-btn small timer-pause-btn" onClick={handlePauseTimer}>
                  ⏸ Pause
                </button>
              )}
              <button type="button" className="secondary-btn small timer-reset-btn" onClick={handleResetTimer} disabled={seconds === 0}>
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Specs Bar */}
          <div className="modal-spec-summary">
            <div>
              <span className="spec-label">Target Area</span>
              <strong>🎯 {ex.targetBodyPart || 'General'}</strong>
            </div>
            <div>
              <span className="spec-label">Prescription</span>
              <strong>🔢 {ex.sets || 3} sets × {ex.reps || 10} reps</strong>
            </div>
            <div>
              <span className="spec-label">Frequency</span>
              <strong>📅 {item?.frequency || 'Daily'}</strong>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="modal-instructions-panel">
            <h4 className="section-subtitle">📋 Step-by-Step Instructions</h4>
            <div className="instructions-text-block">
              {ex.instructions ? (
                <p className="instructions-paragraph">{ex.instructions}</p>
              ) : (
                <p className="empty-state">No instructions documented. Perform movements gently within your comfort zone.</p>
              )}
            </div>
          </div>

          {/* Safety Precautions */}
          {ex.precautions && (
            <div className="modal-precautions-panel">
              <h4 className="section-subtitle precautions-title">🛡️ Safety & Precautions</h4>
              <p>{ex.precautions}</p>
            </div>
          )}

          {/* Completion Form Section */}
          <div className="modal-completion-section">
            <div className="completion-toggle-header">
              <div>
                <span className="card-eyebrow">Session Completion</span>
                <h3>Record Your Progress</h3>
              </div>
              {!showCompletionSection && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowCompletionSection(true)}
                >
                  ✓ Complete & Log Progress
                </button>
              )}
            </div>

            {showCompletionSection && (
              <form className="modal-completion-form" onSubmit={handleSubmit}>
                {/* Accessible Pain Slider */}
                <div className="form-field-block pain-field">
                  <div className="field-header-row">
                    <label htmlFor="pain-level-slider">
                      <strong>Reported Pain Level (0–10)</strong>
                    </label>
                    <span className="pain-badge" style={{ backgroundColor: painInfo.color, color: '#fff' }}>
                      {painInfo.label}
                    </span>
                  </div>
                  <input
                    id="pain-level-slider"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={painLevel}
                    onChange={(e) => setPainLevel(e.target.value)}
                    className="pain-slider"
                    disabled={submitting}
                  />
                  <div className="pain-scale-ticks">
                    <span>0 (None)</span>
                    <span>2</span>
                    <span>4 (Moderate)</span>
                    <span>6</span>
                    <span>8</span>
                    <span>10 (Severe)</span>
                  </div>
                  <small className="pain-desc-hint">{painInfo.desc}</small>
                </div>

                {/* Optional Patient Notes */}
                <div className="form-field-block">
                  <label htmlFor="completion-notes">
                    <strong>Patient Notes (Optional)</strong>
                  </label>
                  <textarea
                    id="completion-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Felt easier today, mild knee tightness during last set, good range of motion"
                    rows="3"
                    maxLength={500}
                    disabled={submitting}
                  />
                  <small className="char-count">{notes.length}/500 characters</small>
                </div>

                {/* Optional Mobility Score */}
                <div className="form-field-block">
                  <label htmlFor="mobility-score-input">
                    <strong>Estimated Movement Score (0–100)</strong>
                  </label>
                  <input
                    id="mobility-score-input"
                    type="number"
                    min="0"
                    max="100"
                    value={mobilityScore}
                    onChange={(e) => setMobilityScore(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="completion-form-actions">
                  <button
                    type="submit"
                    className="primary-btn submit-completion-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving to Database...' : '💾 Submit & Save Progress'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowCompletionSection(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
