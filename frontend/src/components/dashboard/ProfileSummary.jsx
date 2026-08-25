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

export default function ProfileSummary({ profile, user }) {
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

  return (
    <section className="dashboard-card profile-summary-card" aria-labelledby="profile-summary-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Patient Identity</span>
        <div className="profile-heading-row">
          <h3 id="profile-summary-title">Patient Profile Summary</h3>
          <span className={`status-pill ${isComplete ? 'complete' : 'pending'}`}>
            {isComplete ? 'Profile Complete' : 'Profile Active'}
          </span>
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
    </section>
  )
}
