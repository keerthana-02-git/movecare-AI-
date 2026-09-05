import { useState } from 'react'

function formatDate(value) {
  if (!value) return 'Not provided'
  try {
    const d = new Date(value)
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return 'Not provided'
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
  } catch {
    return 'Not provided'
  }
}

function toInputDate(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

import { API_BASE_URL } from '../../config'

export default function ProfileSummary({ profile, user, onProfileUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: profile?.name || user?.name || '',
    medicalCondition: profile?.medicalCondition === 'Profile setup required' ? '' : (profile?.medicalCondition || ''),
    injuryDescription: profile?.injuryDescription || '',
    dateOfBirth: toInputDate(profile?.dateOfBirth),
    gender: profile?.gender || 'Other',
    phoneNumber: profile?.phoneNumber || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const name = profile?.name || user?.name || 'Patient'
  const email = profile?.email || user?.email || 'No email provided'
  const condition = profile?.medicalCondition && profile.medicalCondition !== 'Profile setup required'
    ? profile.medicalCondition
    : 'Profile setup pending'
  const injury = profile?.injuryDescription?.trim() ? profile.injuryDescription : 'No injury notes'
  const therapistName = profile?.assignedTherapist?.name || 'Care team pending'
  const therapistSpec = profile?.assignedTherapist?.specialization ? ` (${profile.assignedTherapist.specialization})` : ''
  const status = profile?.status || 'Active'
  const isComplete = profile?.profileCompleted

  const handleOpenEdit = () => {
    setFormData({
      name: profile?.name || user?.name || '',
      medicalCondition: profile?.medicalCondition === 'Profile setup required' ? '' : (profile?.medicalCondition || ''),
      injuryDescription: profile?.injuryDescription || '',
      dateOfBirth: toInputDate(profile?.dateOfBirth),
      gender: profile?.gender || 'Other',
      phoneNumber: profile?.phoneNumber || '',
    })
    setError('')
    setIsEditing(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const token = localStorage.getItem('movecare-token')
    try {
      const response = await fetch(`${API_BASE_URL}/patients/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile.')
      }

      setIsEditing(false)
      if (onProfileUpdated) {
        await onProfileUpdated()
      }
    } catch (err) {
      setError(err.message || 'Failed to save profile updates. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="dashboard-card profile-summary-card" aria-labelledby="profile-summary-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Patient Identity</span>
        <div className="profile-heading-row">
          <h3 id="profile-summary-title">Patient Profile Summary</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`status-pill ${isComplete ? 'complete' : 'pending'}`}>
              {isComplete ? 'Profile Complete' : 'Profile Active'}
            </span>
            <button
              type="button"
              className="secondary-btn small"
              onClick={handleOpenEdit}
              title="Update medical condition, injury notes, or personal details"
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="profile-hero-mini">
        <div className="profile-avatar-badge" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-hero-info">
          <strong className="profile-user-name">{name}</strong>
          <span className="profile-user-email">{email}</span>
        </div>
      </div>

      <dl className="profile-data-grid">
        <div className="profile-data-item">
          <dt>Condition</dt>
          <dd title={condition}>{condition}</dd>
        </div>
        <div className="profile-data-item">
          <dt>Assigned Therapist</dt>
          <dd title={`${therapistName}${therapistSpec}`}>
            {therapistName}
            {therapistSpec && <small className="therapist-spec-tag">{therapistSpec}</small>}
          </dd>
        </div>
        <div className="profile-data-item">
          <dt>Date of Birth</dt>
          <dd>{formatDate(profile?.dateOfBirth)}</dd>
        </div>
        <div className="profile-data-item">
          <dt>Gender</dt>
          <dd>{profile?.gender || 'Not specified'}</dd>
        </div>
        <div className="profile-data-item">
          <dt>Phone Number</dt>
          <dd>{profile?.phoneNumber || 'Not provided'}</dd>
        </div>
        <div className="profile-data-item">
          <dt>Care Status</dt>
          <dd>
            <span className={`status-dot ${status.toLowerCase()}`} />
            {status}
          </dd>
        </div>
      </dl>

      {injury !== 'No injury notes' && (
        <div className="profile-notes-banner">
          <span className="notes-label">Injury notes:</span> {injury}
        </div>
      )}

      {/* Real Patient Profile Edit Modal */}
      {isEditing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">Care Identity</span>
                <h3 id="edit-profile-title">Update Patient Profile</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => !submitting && setIsEditing(false)}
                disabled={submitting}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {error && <div className="form-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} className="assignment-form">
              <label>
                Full Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                  required
                />
              </label>

              <label>
                Medical Condition / Diagnosis
                <input
                  type="text"
                  value={formData.medicalCondition}
                  onChange={(e) => setFormData({ ...formData, medicalCondition: e.target.value })}
                  placeholder="e.g. Knee Osteoarthritis, Rotator Cuff Tear"
                  required
                />
              </label>

              <label>
                Injury Notes & Symptoms
                <textarea
                  value={formData.injuryDescription}
                  onChange={(e) => setFormData({ ...formData, injuryDescription: e.target.value })}
                  placeholder="Describe joint discomfort, movement restrictions, or surgery details..."
                  rows="3"
                />
              </label>

              <div className="form-grid">
                <label>
                  Date of Birth
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </label>

                <label>
                  Gender
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <label>
                Phone Number (at least 10 digits)
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="e.g. 5551234567"
                />
              </label>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsEditing(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                  style={{ flex: 2 }}
                >
                  {submitting ? 'Saving to Database...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
