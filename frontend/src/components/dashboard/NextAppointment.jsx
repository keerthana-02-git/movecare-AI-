import { NavLink } from 'react-router-dom'

function formatAppointmentDate(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return ''
  }
}

export default function NextAppointment({ appointment }) {
  const hasAppointment = Boolean(appointment && (appointment.appointmentDate || appointment._id))

  const therapistName = appointment?.therapistName || appointment?.therapist?.user?.name || 'Assigned Therapist'
  const therapistSpec = appointment?.therapistSpecialization || appointment?.therapist?.specialization || 'Physical Therapy'
  const appointmentDate = formatAppointmentDate(appointment?.appointmentDate)
  const timeSlot = appointment?.startTime && appointment?.endTime
    ? `${appointment.startTime} - ${appointment.endTime}`
    : (appointment?.startTime || 'Scheduled Time')
  const status = appointment?.status || 'Scheduled'
  const type = appointment?.type || 'Treatment Session'
  const mode = appointment?.consultationMode || 'Virtual'
  const location = appointment?.location
  const appointmentId = appointment?.id || appointment?._id

  return (
    <section className="dashboard-card next-appointment-card" aria-labelledby="next-appointment-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Upcoming Care</span>
        <div className="appointment-heading-row">
          <h3 id="next-appointment-title">Next Appointment</h3>
          {hasAppointment && (
            <span className={`appointment-status-badge ${status.toLowerCase()}`}>
              {status}
            </span>
          )}
        </div>
      </div>

      {hasAppointment ? (
        <div className="appointment-card-body">
          <div className="appointment-main-info">
            <div className="appointment-calendar-tag">
              <span className="cal-icon" aria-hidden="true">📅</span>
              <div>
                <strong className="appointment-date-text">{appointmentDate}</strong>
                <span className="appointment-time-text">{timeSlot}</span>
              </div>
            </div>

            <div className="appointment-provider-row">
              <div className="provider-avatar" aria-hidden="true">
                {therapistName.charAt(0).toUpperCase()}
              </div>
              <div className="provider-details">
                <strong className="provider-name">{therapistName}</strong>
                <span className="provider-spec">{therapistSpec}</span>
              </div>
            </div>

            <div className="appointment-attributes-tags">
              <span className="attr-pill type">{type}</span>
              <span className="attr-pill mode">
                {mode === 'Virtual' ? '💻 Virtual Consultation' : '🏥 In-Person Visit'}
              </span>
              {location && <span className="attr-pill location">📍 {location}</span>}
            </div>
          </div>

          <div className="appointment-card-actions">
            {appointmentId ? (
              <NavLink
                to={`/consultation/${appointmentId}`}
                className="primary-btn small join-consultation-btn"
              >
                {mode === 'Virtual' ? 'Open Consultation Room' : 'View Appointment Details'} →
              </NavLink>
            ) : (
              <NavLink to="/appointments" className="secondary-btn small">
                Manage Schedule
              </NavLink>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-appointment-state">
          <span className="empty-state-icon" aria-hidden="true">📅</span>
          <h4>No Upcoming Consultations</h4>
          <p>
            You have no upcoming therapy sessions booked. Schedule a follow-up or assessment with your therapist.
          </p>
          <NavLink to="/appointments" className="primary-btn small book-btn">
            Book a Consultation
          </NavLink>
        </div>
      )}
    </section>
  )
}
