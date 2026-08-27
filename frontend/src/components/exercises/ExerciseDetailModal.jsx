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

function getClinicalYouTubeFallback(name = '', bodyPart = '') {
  const n = String(name || '').toLowerCase()
  const b = String(bodyPart || '').toLowerCase()

  // Seated Leg Raise / Knee Extension / Long Arc Quad
  if ((n.includes('seated') && n.includes('leg')) || n.includes('seated knee') || n.includes('long arc')) {
    return 'https://www.youtube-nocookie.com/embed/CWVEVBOGNE8' // Ask Doctor Jo - Seated Leg Exercises
  }

  // Straight Leg Raise
  if (n.includes('leg raise') || n.includes('straight leg') || n.includes('slr')) {
    return 'https://www.youtube-nocookie.com/embed/Ka19yzAlIGY' // Ask Doctor Jo - Straight Leg Raise
  }

  // Knee Extensions / TKE / Quad Sets
  if (n.includes('quad') || n.includes('quadriceps') || n.includes('terminal') || n.includes('tke') || b.includes('knee')) {
    return 'https://www.youtube-nocookie.com/embed/au62CidApd0' // Ask Doctor Jo - Quad Sets
  }

  // Heel Slides / Hamstring
  if (n.includes('hamstring') || n.includes('curl') || n.includes('heel slide')) {
    return 'https://www.youtube-nocookie.com/embed/qdxGglzCr1I' // Knee Relief & Range of Motion
  }

  // Neck / Cervical / Chin Tuck
  if (n.includes('chin tuck') || n.includes('cervical') || b.includes('neck')) {
    return 'https://www.youtube-nocookie.com/embed/QQMfNNHcf8w' // Ask Doctor Jo - Chin Tucks
  }

  // Shoulder / Wall Slide
  if (n.includes('wall slide') || n.includes('scapular') || n.includes('wall')) {
    return 'https://www.youtube-nocookie.com/embed/D351y9ecIwc' // MGH - Wall Slide Exercise
  }

  // Shoulder / Pendulum / Arm
  if (n.includes('pendulum') || b.includes('shoulder') || n.includes('arm')) {
    return 'https://www.youtube-nocookie.com/embed/QF_ubbr_RUE' // Ask Doctor Jo - Codman Pendulum
  }

  // Back / Lumbar / Glute Bridge / Pelvic
  if (n.includes('bridge') || n.includes('pelvic') || n.includes('cat') || b.includes('back') || b.includes('lumbar')) {
    return 'https://www.youtube-nocookie.com/embed/wPM8icPu6H8' // Well+Good - Glute Bridge
  }

  // Core / Bird Dog
  if (n.includes('bird dog') || n.includes('core') || n.includes('abdominal')) {
    return 'https://www.youtube-nocookie.com/embed/wiFNA3sqjCA' // Howcast - Bird Dog Exercise
  }

  return 'https://www.youtube-nocookie.com/embed/CWVEVBOGNE8'
}

function resolveVideoEmbed(videoUrl, exerciseName, targetBodyPart) {
  if (
    !videoUrl ||
    typeof videoUrl !== 'string' ||
    !videoUrl.trim() ||
    videoUrl.includes('example.com') ||
    videoUrl.includes('mock-') ||
    videoUrl.includes('4y_v1tE4i4w') ||
    videoUrl.includes('Xm8oB0bJzP0') ||
    videoUrl.includes('kYJmQn-3h34') ||
    videoUrl.includes('y3uVjJzB90E') ||
    videoUrl.includes('F3QfT08gR9Q') ||
    videoUrl.includes('W5_gJ3o_Y2I')
  ) {
    return {
      type: 'youtube',
      src: getClinicalYouTubeFallback(exerciseName, targetBodyPart),
    }
  }

  const url = videoUrl.trim()

  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('watch?v=')[1]?.split('&')[0]
    if (videoId) return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${videoId}` }
  }

  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0]
    if (videoId) return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${videoId}` }
  }

  if (url.includes('youtube.com/embed/')) {
    return { type: 'youtube', src: url.replace('youtube.com/embed/', 'youtube-nocookie.com/embed/') }
  }

  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
    if (videoId) return { type: 'vimeo', src: `https://player.vimeo.com/video/${videoId}` }
  }

  if (url.endsWith('.mp4') || url.endsWith('.webm')) {
    return { type: 'video', src: url }
  }

  return {
    type: 'youtube',
    src: getClinicalYouTubeFallback(exerciseName, targetBodyPart),
  }
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
    const embed = resolveVideoEmbed(ex.videoUrl, ex.name, ex.targetBodyPart)

    if (embed.type === 'youtube' || embed.type === 'vimeo') {
      return (
        <div
          className="exercise-video-embed-container"
          style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            borderRadius: '0.85rem',
            marginBottom: '1.25rem',
            background: '#0f172a',
            boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
          }}
        >
          <iframe
            src={`${embed.src}?rel=0&modestbranding=1&autoplay=0`}
            title={`${ex.name || 'Exercise'} Video Demonstration`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
              borderRadius: '0.85rem',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )
    }

    if (embed.type === 'video') {
      return (
        <div
          className="exercise-video-embed-container"
          style={{
            borderRadius: '0.85rem',
            overflow: 'hidden',
            marginBottom: '1.25rem',
            background: '#000',
          }}
        >
          <video controls playsInline preload="metadata" style={{ width: '100%', maxHeight: '380px', display: 'block' }}>
            <source src={embed.src} type="video/mp4" />
            Your browser does not support video playback.
          </video>
        </div>
      )
    }

    return null
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
