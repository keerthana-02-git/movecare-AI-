import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import ExerciseDetailModal from '../exercises/ExerciseDetailModal'

export default function TodaysExercises({
  exercises,
  onCompleteExercise,
  onActivateStarterPlan,
  activatingStarter = false,
}) {
  const [activeModalItem, setActiveModalItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const todayList = Array.isArray(exercises?.today) ? exercises.today : []
  const todayTotal = exercises?.todayTotal ?? todayList.length
  const todayCompleted = exercises?.todayCompleted ?? todayList.filter((e) => e.isCompletedToday).length
  const todayRemaining = exercises?.todayRemaining ?? Math.max(0, todayTotal - todayCompleted)

  const handleOpenModal = (item) => {
    setModalError('')
    setActiveModalItem(item)
  }

  const handleCloseModal = () => {
    if (!submitting) {
      setActiveModalItem(null)
      setModalError('')
    }
  }

  const handleModalComplete = async (exerciseId, planId, completionData) => {
    if (!onCompleteExercise) return
    try {
      setSubmitting(true)
      setModalError('')
      await onCompleteExercise(exerciseId, planId, completionData)
      setActiveModalItem(null)
    } catch (err) {
      setModalError(err.message || 'Failed to complete exercise. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="dashboard-card todays-exercises-card" aria-labelledby="todays-exercises-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Daily Schedule</span>
        <div className="exercises-heading-row">
          <h3 id="todays-exercises-title">Today&apos;s Recovery Exercises</h3>
          <span className="exercise-count-badge">
            <strong>{todayCompleted}</strong> of <strong>{todayTotal}</strong> completed
          </span>
        </div>
      </div>

      {todayList.length > 0 ? (
        <>
          <div className="todays-exercises-list">
            {todayList.map((item, index) => {
              const ex = item.exercise || {}
              const isDone = Boolean(item.isCompletedToday)
              const exId = ex._id || `item-${index}`

              return (
                <article
                  key={`${item.planId || 'plan'}-${exId}`}
                  className={`exercise-schedule-item ${isDone ? 'is-completed' : 'is-pending'}`}
                >
                  <div className="schedule-status-col">
                    <span
                      className={`status-checkbox-indicator ${isDone ? 'checked' : ''}`}
                      aria-label={isDone ? 'Completed today' : 'Pending completion'}
                    >
                      {isDone ? '✓' : ''}
                    </span>
                  </div>

                  <div className="schedule-info-col">
                    <div className="schedule-title-row">
                      <strong className="schedule-exercise-name">{ex.name || 'Assigned Exercise'}</strong>
                      <span className={`difficulty-pill ${ex.difficulty?.toLowerCase() || 'medium'}`}>
                        {ex.difficulty || 'Medium'}
                      </span>
                    </div>

                    <div className="schedule-meta-tags">
                      {ex.category && <span className="meta-tag category">{ex.category}</span>}
                      {ex.targetBodyPart && <span className="meta-tag body-part">🎯 {ex.targetBodyPart}</span>}
                      {ex.duration && <span className="meta-tag duration">⏱ {ex.duration} min</span>}
                      {ex.sets && ex.reps && (
                        <span className="meta-tag sets-reps">
                          {ex.sets} {ex.sets === 1 ? 'set' : 'sets'} × {ex.reps} reps
                        </span>
                      )}
                      {item.frequency && <span className="meta-tag freq">📅 {item.frequency}</span>}
                    </div>

                    {item.planName && (
                      <span className="schedule-plan-label">Plan: {item.planName}</span>
                    )}
                  </div>

                  <div className="schedule-action-col">
                    {isDone ? (
                      <button
                        type="button"
                        className="completed-badge-pill-btn"
                        onClick={() => handleOpenModal(item)}
                        title="Review exercise instructions"
                      >
                        <span className="check-icon" aria-hidden="true">✓</span> Done Today
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="start-exercise-btn"
                        onClick={() => handleOpenModal(item)}
                        title={`Start ${ex.name || 'exercise'}`}
                      >
                        Start Session →
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="exercises-card-footer">
            <span className="remaining-label">
              {todayRemaining > 0
                ? `${todayRemaining} ${todayRemaining === 1 ? 'exercise' : 'exercises'} left for today`
                : '🎉 All assigned exercises completed for today!'}
            </span>
            <NavLink to="/my-exercises" className="view-all-exercises-link">
              View All Exercises ({exercises?.totalAssigned ?? todayTotal}) →
            </NavLink>
          </div>
        </>
      ) : onActivateStarterPlan ? (
        <div className="starter-routine-banner">
          <span style={{ fontSize: '2.5rem', display: 'inline-block' }}>✨</span>
          <h4>Ready to Begin Your Recovery?</h4>
          <p>
            You do not have any active rehabilitation plans assigned yet. You can instantly activate our clinical recovery routine tailored to your condition right now!
          </p>
          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary-btn"
              onClick={onActivateStarterPlan}
              disabled={activatingStarter}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {activatingStarter ? '✨ Activating Routine...' : '✨ Activate Tailored Routine'}
            </button>
            <NavLink to="/my-exercises" className="secondary-btn small">
              Browse Library
            </NavLink>
          </div>
        </div>
      ) : (
        <div className="empty-exercises-state">
          <span className="empty-state-icon" aria-hidden="true">🧘</span>
          <h4>No Exercises Scheduled for Today</h4>
          <p>
            You are all caught up for today! If your therapist creates or activates an exercise plan, it will show up here automatically.
          </p>
          <NavLink to="/my-exercises" className="secondary-btn small">
            Browse Exercise Library
          </NavLink>
        </div>
      )}

      {/* Interactive Detail & Guided Completion Modal */}
      {activeModalItem && (
        <ExerciseDetailModal
          item={activeModalItem}
          onClose={handleCloseModal}
          onComplete={handleModalComplete}
          submitting={submitting}
          submitError={modalError}
        />
      )}
    </section>
  )
}
