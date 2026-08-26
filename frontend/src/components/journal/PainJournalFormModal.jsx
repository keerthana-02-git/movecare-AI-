import { useState, useEffect } from 'react'

const BODY_PARTS = [
  'Shoulder',
  'Knee',
  'Back',
  'Neck',
  'Hip',
  'Ankle',
  'Elbow',
  'Wrist',
  'Other',
]

const SYMPTOM_OPTIONS = [
  'Stiffness',
  'Swelling',
  'Weakness',
  'Reduced movement',
  'Muscle soreness',
  'Discomfort',
  'Sharp pain',
  'Aching',
  'Other',
]

const MOBILITY_OPTIONS = [
  { val: 1, label: '1 - Very Limited', desc: 'Severe range restriction' },
  { val: 2, label: '2 - Limited', desc: 'Noticeable tightness & resistance' },
  { val: 3, label: '3 - Moderate', desc: 'Functional movement with effort' },
  { val: 4, label: '4 - Good', desc: 'Near full range with minimal friction' },
  { val: 5, label: '5 - Excellent', desc: 'Free, pain-free normal mobility' },
]

function getPainColor(level) {
  const n = Number(level)
  if (n === 0) return '#10b981'
  if (n <= 3) return '#0d8b85'
  if (n <= 6) return '#f59e0b'
  return '#ef4444'
}

function getPainDescription(level) {
  const n = Number(level)
  if (n === 0) return '0 = No Pain'
  if (n <= 3) return `${n} = Mild Pain (barely noticeable)`
  if (n <= 6) return `${n} = Moderate Pain (interferes with tasks)`
  if (n <= 8) return `${n} = Severe Pain (hard to move)`
  return `${n} = Worst Pain (unbearable)`
}

export default function PainJournalFormModal({
  initialEntry = null,
  onClose,
  onSubmit,
  submitting = false,
  error = '',
}) {
  const isEditing = Boolean(initialEntry && initialEntry._id)

  const [painLevel, setPainLevel] = useState(initialEntry ? Number(initialEntry.painLevel) : 2)
  const [mobilityLevel, setMobilityLevel] = useState(initialEntry ? Number(initialEntry.mobilityLevel) : 4)
  const [bodyPart, setBodyPart] = useState(initialEntry?.bodyPart || 'Shoulder')
  const [customBodyPart, setCustomBodyPart] = useState(
    initialEntry && !BODY_PARTS.includes(initialEntry.bodyPart) ? initialEntry.bodyPart : ''
  )
  const [symptoms, setSymptoms] = useState(
    Array.isArray(initialEntry?.symptoms) ? initialEntry.symptoms : []
  )
  const [notes, setNotes] = useState(initialEntry?.notes || '')
  const [clientError, setClientError] = useState('')

  useEffect(() => {
    if (initialEntry) {
      setPainLevel(Number(initialEntry.painLevel ?? 2))
      setMobilityLevel(Number(initialEntry.mobilityLevel ?? 4))
      if (BODY_PARTS.includes(initialEntry.bodyPart)) {
        setBodyPart(initialEntry.bodyPart)
        setCustomBodyPart('')
      } else if (initialEntry.bodyPart) {
        setBodyPart('Other')
        setCustomBodyPart(initialEntry.bodyPart)
      }
      setSymptoms(Array.isArray(initialEntry.symptoms) ? initialEntry.symptoms : [])
      setNotes(initialEntry.notes || '')
    }
  }, [initialEntry])

  const toggleSymptom = (sym) => {
    setSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setClientError('')

    const effectiveBodyPart = bodyPart === 'Other' ? customBodyPart.trim() : bodyPart
    if (!effectiveBodyPart) {
      setClientError('Please specify the affected body part.')
      return
    }

    if (notes.length > 500) {
      setClientError('Notes cannot exceed 500 characters.')
      return
    }

    onSubmit({
      painLevel: Number(painLevel),
      mobilityLevel: Number(mobilityLevel),
      bodyPart: effectiveBodyPart,
      symptoms,
      notes: notes.trim(),
      ...(initialEntry?._id ? { entryId: initialEntry._id } : {}),
      ...(initialEntry?.date ? { date: initialEntry.date } : {}),
    })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="journal-modal-title">
      <div className="modal-content journal-form-modal">
        <div className="modal-header">
          <div>
            <span className="card-eyebrow">Daily Rehabilitation Log</span>
            <h2 id="journal-modal-title">
              {isEditing ? 'Edit Pain & Mobility Entry' : "Log Today's Pain & Mobility"}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close form"
          >
            ✕
          </button>
        </div>

        {(error || clientError) && (
          <div className="form-error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <span>{clientError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="journal-modal-form">
          {/* 1. Pain Level Section */}
          <div className="journal-form-group">
            <div className="journal-label-row">
              <label htmlFor="pain-range-input">
                <strong>1. Pain Level (0–10)</strong>
              </label>
              <span
                className="pain-val-indicator"
                style={{ color: getPainColor(painLevel) }}
              >
                {getPainDescription(painLevel)}
              </span>
            </div>

            <div className="pain-slider-wrap">
              <input
                id="pain-range-input"
                type="range"
                min="0"
                max="10"
                step="1"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="pain-slider-range"
              />
              <div className="pain-range-ticks" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`tick-btn ${painLevel === num ? 'active' : ''}`}
                    onClick={() => setPainLevel(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Mobility Level Section */}
          <div className="journal-form-group">
            <label className="journal-group-title">
              <strong>2. Mobility Level (1–5)</strong>
            </label>
            <div className="mobility-options-grid" role="radiogroup" aria-label="Mobility Level">
              {MOBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  role="radio"
                  aria-checked={mobilityLevel === opt.val}
                  className={`mobility-opt-btn ${mobilityLevel === opt.val ? 'selected' : ''}`}
                  onClick={() => setMobilityLevel(opt.val)}
                >
                  <strong className="opt-title">{opt.label}</strong>
                  <span className="opt-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Affected Body Part Section */}
          <div className="journal-form-group">
            <label htmlFor="body-part-select" className="journal-group-title">
              <strong>3. Affected Body Part</strong>
            </label>
            <div className="body-part-select-wrap">
              <select
                id="body-part-select"
                className="form-control"
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
              >
                {BODY_PARTS.map((bp) => (
                  <option key={bp} value={bp}>
                    {bp}
                  </option>
                ))}
              </select>

              {bodyPart === 'Other' && (
                <input
                  type="text"
                  className="form-control custom-body-part-input"
                  placeholder="Specify affected joint or muscle area..."
                  value={customBodyPart}
                  onChange={(e) => setCustomBodyPart(e.target.value)}
                  maxLength={50}
                  required
                />
              )}
            </div>
          </div>

          {/* 4. Symptoms Selection */}
          <div className="journal-form-group">
            <label className="journal-group-title">
              <strong>4. Symptoms Experienced</strong>
            </label>
            <div className="symptoms-pills-wrap">
              {SYMPTOM_OPTIONS.map((sym) => {
                const selected = symptoms.includes(sym)
                return (
                  <button
                    key={sym}
                    type="button"
                    className={`symptom-pill-btn ${selected ? 'active' : ''}`}
                    onClick={() => toggleSymptom(sym)}
                  >
                    {selected ? '✓ ' : '+ '}
                    {sym}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. Notes */}
          <div className="journal-form-group">
            <div className="journal-label-row">
              <label htmlFor="journal-notes">
                <strong>5. Patient Notes (Optional)</strong>
              </label>
              <span className="char-counter">{notes.length} / 500</span>
            </div>
            <textarea
              id="journal-notes"
              className="form-control journal-textarea"
              placeholder="e.g. Shoulder felt slightly looser after morning stretching. Mild ache when lifting overhead."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={submitting}
            >
              {submitting ? 'Saving Check-in...' : isEditing ? 'Update Check-in' : 'Save Check-in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
