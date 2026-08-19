import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import './App.css'

const API_BASE_URL = 'http://localhost:5000/api'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('movecare-token')}`,
      ...options.headers,
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Request failed')
  return data
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Features', to: '/features' },
  { label: 'Services', to: '/services' },
  { label: 'Contact', to: '/contact' },
]

const featureCards = [
  {
    icon: '01',
    title: 'Virtual Consultations',
    text: 'Connect with licensed specialists remotely for faster screening, assessment, and personalized care plans.',
  },
  {
    icon: '02',
    title: 'Personalized Exercise Programs',
    text: 'Receive guided rehabilitation routines tailored to the patient’s condition, goals, and movement patterns.',
  },
  {
    icon: '03',
    title: 'Real-time Monitoring',
    text: 'Track mobility, range of motion, and exercise adherence with actionable data and live progress visibility.',
  },
  {
    icon: '04',
    title: 'Progress Tracking',
    text: 'Visualize treatment improvements over time to keep patients engaged and clinicians informed at every step.',
  },
  {
    icon: '05',
    title: 'AI-powered Recommendations',
    text: 'Use intelligent insights to suggest adjustments, highlight risks, and improve long-term recovery outcomes.',
  },
]

const serviceCards = [
  'Post-injury recovery and rehabilitation',
  'Mobility and posture correction programs',
  'Remote musculoskeletal assessment',
  'Exercise adherence and coaching',
  'Progress reporting for clinicians',
  'Patient education and home-care planning',
]

const metrics = [
  { value: '24/7', label: 'Digital care access' },
  { value: 'AI', label: 'Guided recommendations' },
  { value: '90%', label: 'Improved adherence' },
]

const steps = [
  'Initial evaluation and goal setting',
  'Smart exercise plan generation',
  'Remote monitoring and feedback',
  'Continuous recovery optimization',
]

function Navbar({ user, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    const token = localStorage.getItem('movecare-token')

    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }

    localStorage.removeItem('movecare-token')
    localStorage.removeItem('movecare-user')
    onLogout()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div className="container nav-wrap">
        <NavLink to="/" className="brand" end>
          <span className="brand-mark">M</span>
          <span>MoveCare AI</span>
        </NavLink>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <NavLink to="/dashboard" className="secondary-btn small">
                Dashboard
              </NavLink>
              {user.role === 'Therapist' && <NavLink to="/exercise-management" className="secondary-btn small">Exercises</NavLink>}
              {user.role === 'Patient' && <NavLink to="/my-exercises" className="secondary-btn small">My exercises</NavLink>}
              <button type="button" className="primary-btn small" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="secondary-btn small">
                Login
              </NavLink>
              <NavLink to="/register" className="primary-btn small">
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

function FeatureCard({ icon, title, text }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function ServiceCard({ title }) {
  return (
    <div className="service-item">
      <span className="check-mark">✓</span>
      <p>{title}</p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-wrap">
        <div>
          <h3>MoveCare AI</h3>
          <p>Enhancing musculoskeletal health through accessible remote physical therapy and care.</p>
        </div>
        <div>
          <h4>Quick links</h4>
          <ul>
            <li><NavLink to="/about">About</NavLink></li>
            <li><NavLink to="/features">Features</NavLink></li>
            <li><NavLink to="/services">Services</NavLink></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>hello@movecare.ai</li>
            <li>+1 (555) 487-2040</li>
            <li>Remote care support</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

function HomePage() {
  return (
    <main>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow accent">Healthcare innovation</span>
            <h1>MoveCare AI</h1>
            <p className="lead">
              Enhancing musculoskeletal health through accessible remote physical therapy and care.
            </p>
            <div className="cta-row">
              <NavLink to="/services" className="primary-btn">Explore Services</NavLink>
              <NavLink to="/register" className="secondary-btn">Talk to a Specialist</NavLink>
            </div>
            <div className="metric-row">
              {metrics.map((metric) => (
                <div key={metric.label} className="metric-box">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-card">
              <span className="panel-label">Care dashboard</span>
              <h3>Recovery progress overview</h3>
              <div className="mini-chart">
                <span style={{ height: '38%' }} />
                <span style={{ height: '58%' }} />
                <span style={{ height: '72%' }} />
                <span style={{ height: '82%' }} />
                <span style={{ height: '100%' }} />
              </div>
              <div className="panel-footer">
                <div>
                  <small>Mobility score</small>
                  <strong>84%</strong>
                </div>
                <span className="status-pill">On track</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container section-block">
        <SectionTitle
          eyebrow="Key capabilities"
          title="Smart support for recovery and long-term movement health"
          description="MoveCare AI brings together remote care, adaptive exercise plans, and actionable health insights to improve patient outcomes."
        />

        <div className="feature-grid">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="alt-section">
        <div className="container split-layout">
          <div>
            <span className="eyebrow">Why patients choose us</span>
            <h2>A seamless remote care experience that keeps recovery on track</h2>
          </div>
          <div className="check-list">
            {steps.map((step) => (
              <div key={step} className="check-item">
                <span>✓</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function AboutPage() {
  return (
    <main className="page-shell">
      <div className="container narrow">
        <SectionTitle
          eyebrow="About"
          title="Designed for accessible, patient-first musculoskeletal care"
          description="MoveCare AI is a healthcare-tech concept focused on making physical therapy more measurable, convenient, and personalized through digital tools and remote support."
        />

        <div className="content-card">
          <p>
            Our approach combines clinical understanding with digital care pathways, helping users
            improve mobility, monitor progress, and stay motivated from home. The platform is built
            to support both patients and care teams with clear guidance and simple progress tracking.
          </p>
        </div>
      </div>
    </main>
  )
}

function FeaturesPage() {
  return (
    <main className="page-shell">
      <div className="container">
        <SectionTitle
          eyebrow="Features"
          title="Focused tools for smarter musculoskeletal care"
          description="Every feature is designed to reduce barriers to recovery and make remote therapy more effective and engaging."
        />

        <div className="feature-grid large">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </main>
  )
}

function ServicesPage() {
  return (
    <main className="page-shell">
      <div className="container narrow">
        <SectionTitle
          eyebrow="Services"
          title="Comprehensive digital rehabilitation support"
          description="MoveCare AI helps patients and clinicians manage movement health through remote consultations and personalized care plans."
        />

        <div className="services-grid">
          {serviceCards.map((service) => (
            <ServiceCard key={service} title={service} />
          ))}
        </div>
      </div>
    </main>
  )
}

function ContactPage() {
  return (
    <main className="page-shell">
      <div className="container narrow">
        <SectionTitle
          eyebrow="Contact"
          title="We’re here to support your care journey"
          description="Reach out to learn more about remote physical therapy, movement assessment, and personalized digital recovery programs."
        />

        <div className="contact-card">
          <div>
            <h3>Contact Information</h3>
            <p>Email: hello@movecare.ai</p>
            <p>Phone: +1 (555) 487-2040</p>
            <p>Hours: Monday to Friday, 9:00 AM – 5:00 PM</p>
          </div>
          <a href="mailto:hello@movecare.ai" className="primary-btn">Send an Email</a>
        </div>
      </div>
    </main>
  )
}

function AuthPage({ mode, onAuthComplete }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Patient' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const isRegister = mode === 'register'

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (isRegister && !formData.name.trim()) {
      setError('Name is required.')
      return
    }

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Email and password are required.')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      localStorage.setItem('movecare-token', data.token)
      localStorage.setItem('movecare-user', JSON.stringify(data.user))
      onAuthComplete(data.user)
      navigate('/dashboard')
    } catch (submittedError) {
      setError(submittedError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="container auth-wrap">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-header">
            <span className="eyebrow accent">MoveCare AI</span>
            <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          </div>

          {isRegister && (
            <label>
              Full name
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </label>

          {isRegister && (
            <label>
              Role
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="Patient">Patient</option>
                <option value="Therapist">Therapist</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary-btn auth-button" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
          </button>

          <p className="auth-link">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <NavLink to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Login here' : 'Register here'}
            </NavLink>
          </p>
        </form>
      </div>
    </main>
  )
}

function ProtectedRoute({ user, requiredRole }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function DashboardPage({ user }) {
  const roleContent = {
    Patient: {
      title: 'Patient dashboard',
      summary: 'Your rehabilitation plan, monitoring insights, and therapy progress are ready to review.',
      list: ['Weekly movement goals', 'Remote check-ins', 'Exercise adherence reporting'],
    },
    Therapist: {
      title: 'Therapist dashboard',
      summary: 'Track assigned patients, monitor progress, and adjust care plans efficiently.',
      list: ['Patient progress review', 'AI insights', 'Care plan updates'],
    },
    Admin: {
      title: 'Admin dashboard',
      summary: 'Manage program health, user access, and operational oversight across the platform.',
      list: ['System monitoring', 'User management', 'Compliance review'],
    },
  }

  const content = roleContent[user.role] || roleContent.Patient

  return (
    <main className="page-shell">
      <div className="container dashboard-wrap">
        <div className="dashboard-header">
          <div>
            <span className="eyebrow accent">{user.role}</span>
            <h2>{content.title}</h2>
          </div>
          <span className="role-badge">{user.name}</span>
        </div>

        <div className="dashboard-panel">
          <p>{content.summary}</p>
          <ul>
            {content.list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}

function DashboardCard({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`dashboard-card ${className}`}>
      <div className="dashboard-card-heading">
        <div>
          {eyebrow && <span className="card-eyebrow">{eyebrow}</span>}
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  )
}

function LoadingDashboard() {
  return (
    <main className="page-shell">
      <div className="container dashboard-wrap">
        <div className="dashboard-loading" role="status">Loading your care dashboard...</div>
      </div>
    </main>
  )
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function PatientDashboardPage({ user }) {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('movecare-token')
    const loadDashboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/patients/me/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Unable to load your dashboard')
        setDashboard(data)
      } catch (loadError) {
        setError(loadError.message)
      }
    }
    loadDashboard()
  }, [])

  if (error) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error" role="alert">
            <strong>We could not load your dashboard.</strong>
            <p>{error}. Please try again shortly.</p>
          </div>
        </div>
      </main>
    )
  }

  if (!dashboard) return <LoadingDashboard />

  const { patient, plans, upcomingAppointment, progress, notifications, stats } = dashboard
  const therapistName = patient.assignedTherapist?.user?.name || 'Care team pending'
  const exerciseItems = plans.flatMap((plan) => plan.exercises.map((item) => ({ ...item, planName: plan.name })))
  const completedExerciseIds = new Set(progress.filter((item) => item.completionStatus === 'Completed').map((item) => String(item.exercise?._id)))

  return (
    <main className="page-shell dashboard-page">
      <div className="container dashboard-wrap">
        <div className="dashboard-hero">
          <div>
            <span className="eyebrow accent">Patient dashboard</span>
            <h2>Good to see you, {user.name.split(' ')[0]}.</h2>
            <p>Here is your latest recovery snapshot and today&apos;s care plan.</p>
          </div>
          <div className="dashboard-avatar" aria-hidden="true">{user.name.charAt(0)}</div>
        </div>

        <div className="dashboard-grid">
          <DashboardCard title="Recovery progress" eyebrow="This cycle" className="progress-card">
            <div className="progress-summary">
              <strong>{stats.completionRate}%</strong>
              <span>exercise completion</span>
            </div>
            <div className="progress-track" aria-label={`${stats.completionRate}% exercise completion`}>
              <span style={{ width: `${stats.completionRate}%` }} />
            </div>
            <div className="stat-row">
              <span><strong>{stats.completedSessions}</strong> completed sessions</span>
              <span><strong>{plans.length}</strong> active plans</span>
            </div>
          </DashboardCard>

          <DashboardCard title="Pain & mobility" eyebrow="Latest signal">
            <div className="signal-value">{stats.averagePain === null ? '--' : `${stats.averagePain}/10`}</div>
            <div className="signal-label">Average reported pain</div>
            <span className={`status-pill ${stats.mobilityStatus === 'Needs attention' ? 'warning' : ''}`}>{stats.mobilityStatus}</span>
          </DashboardCard>

          <DashboardCard title="Next appointment" eyebrow="Coming up">
            {upcomingAppointment ? (
              <div className="appointment-detail">
                <strong>{formatDate(upcomingAppointment.appointmentDate)}</strong>
                <span>{upcomingAppointment.startTime} - {upcomingAppointment.endTime} · {upcomingAppointment.type}</span>
                <span>with {upcomingAppointment.therapist?.user?.name || therapistName}</span>
                {upcomingAppointment.location && <small>{upcomingAppointment.location}</small>}
              </div>
            ) : <p className="empty-state">No upcoming appointments scheduled.</p>}
          </DashboardCard>

          <DashboardCard title="My profile" eyebrow="Care details">
            <dl className="profile-list">
              <div><dt>Condition</dt><dd>{patient.medicalCondition}</dd></div>
              <div><dt>Therapist</dt><dd>{therapistName}</dd></div>
              <div><dt>Status</dt><dd>{patient.status}</dd></div>
            </dl>
          </DashboardCard>

          <DashboardCard title="Assigned exercises" eyebrow="Your plan" className="exercise-card">
            {exerciseItems.length ? (
              <div className="exercise-list">
                {exerciseItems.map((item) => (
                  <div className="exercise-row" key={`${item.planName}-${item.exercise?._id}`}>
                    <span className={`exercise-check ${completedExerciseIds.has(String(item.exercise?._id)) ? 'complete' : ''}`} aria-hidden="true">{completedExerciseIds.has(String(item.exercise?._id)) ? '✓' : ''}</span>
                    <div><strong>{item.exercise?.name || 'Exercise'}</strong><span>{item.exercise?.duration} min · {item.frequency}</span></div>
                    <small>{item.exercise?.difficulty}</small>
                  </div>
                ))}
              </div>
            ) : <p className="empty-state">Your care team has not assigned exercises yet.</p>}
          </DashboardCard>

          <DashboardCard title="Notifications" eyebrow="Stay informed">
            {notifications.length ? (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <div className={`notification-row ${notification.isRead ? '' : 'unread'}`} key={notification._id}>
                    <span className="notification-dot" aria-hidden="true" />
                    <div><strong>{notification.title}</strong><p>{notification.message}</p></div>
                  </div>
                ))}
              </div>
            ) : <p className="empty-state">You are all caught up.</p>}
          </DashboardCard>
        </div>
      </div>
    </main>
  )
}

const emptyExercise = {
  name: '', description: '', targetBodyPart: '', category: 'Strengthening', difficulty: 'Medium',
  duration: 10, sets: 3, reps: 10, instructions: '', videoUrl: '', imageUrl: '', precautions: '',
}

function ExerciseForm({ form, setForm, onSubmit, editing, onCancel, loading }) {
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  return (
    <form className="exercise-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>Exercise name<input name="name" value={form.name} onChange={updateField} required /></label>
        <label>Body part<input name="targetBodyPart" value={form.targetBodyPart} onChange={updateField} placeholder="Knee, shoulder..." required /></label>
        <label>Category<select name="category" value={form.category} onChange={updateField}><option>Stretching</option><option>Strengthening</option><option>Balance</option><option>Cardio</option><option>Flexibility</option><option>Coordination</option></select></label>
        <label>Difficulty<select name="difficulty" value={form.difficulty} onChange={updateField}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
        <label>Duration (minutes)<input type="number" min="1" name="duration" value={form.duration} onChange={updateField} required /></label>
        <label>Sets<input type="number" min="1" name="sets" value={form.sets} onChange={updateField} required /></label>
        <label>Repetitions<input type="number" min="1" name="reps" value={form.reps} onChange={updateField} required /></label>
        <label>Video URL<input type="url" name="videoUrl" value={form.videoUrl} onChange={updateField} placeholder="https://..." /></label>
        <label>Image URL<input type="url" name="imageUrl" value={form.imageUrl} onChange={updateField} placeholder="https://..." /></label>
      </div>
      <label>Description<textarea name="description" value={form.description} onChange={updateField} required /></label>
      <label>Instructions<textarea name="instructions" value={form.instructions} onChange={updateField} placeholder="Step-by-step guidance" required /></label>
      <label>Precautions<textarea name="precautions" value={form.precautions} onChange={updateField} placeholder="Optional safety notes" /></label>
      <div className="form-actions"><button className="primary-btn" disabled={loading}>{loading ? 'Saving...' : editing ? 'Save changes' : 'Create exercise'}</button>{editing && <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>}</div>
    </form>
  )
}

function ExerciseManagementPage() {
  const [exercises, setExercises] = useState([])
  const [options, setOptions] = useState({ patients: [], exercises: [] })
  const [form, setForm] = useState(emptyExercise)
  const [assignment, setAssignment] = useState({ patientId: '', exerciseId: '', planName: '', startDate: '', endDate: '', frequency: 'Daily' })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [exerciseData, optionData] = await Promise.all([apiRequest('/exercises'), apiRequest('/exercises/assignment-options')])
      setExercises(exerciseData); setOptions(optionData); setError('')
    } catch (loadError) { setError(loadError.message) } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const handleExerciseSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true); setError(''); setNotice('')
      const saved = await apiRequest(editingId ? `/exercises/${editingId}` : '/exercises', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setExercises((current) => editingId ? current.map((item) => item._id === saved._id ? saved : item) : [saved, ...current])
      setForm(emptyExercise); setEditingId(null); setNotice(editingId ? 'Exercise updated.' : 'Exercise created.')
    } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  const handleDelete = async (exercise) => {
    if (!window.confirm(`Delete ${exercise.name}?`)) return
    try { await apiRequest(`/exercises/${exercise._id}`, { method: 'DELETE' }); setExercises((current) => current.filter((item) => item._id !== exercise._id)); setNotice('Exercise deleted.') } catch (deleteError) { setError(deleteError.message) }
  }

  const handleAssignment = async (event) => {
    event.preventDefault()
    try {
      setSaving(true); setError(''); setNotice('')
      await apiRequest('/exercises/assign', { method: 'POST', body: JSON.stringify(assignment) })
      setAssignment({ patientId: '', exerciseId: '', planName: '', startDate: '', endDate: '', frequency: 'Daily' }); setNotice('Exercise assigned to the patient.')
    } catch (assignmentError) { setError(assignmentError.message) } finally { setSaving(false) }
  }

  return (
    <main className="page-shell"><div className="container management-wrap">
      <div className="management-heading"><div><span className="eyebrow accent">Therapist workspace</span><h2>Exercise management</h2><p>Create a library of clear, trackable exercises and assign them to your patients.</p></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
      <div className="management-layout">
        <section className="management-panel"><h3>{editingId ? 'Edit exercise' : 'Create exercise'}</h3><ExerciseForm form={form} setForm={setForm} onSubmit={handleExerciseSubmit} editing={Boolean(editingId)} onCancel={() => { setEditingId(null); setForm(emptyExercise) }} loading={saving} /></section>
        <section className="management-panel"><h3>Assign an exercise</h3><form className="assignment-form" onSubmit={handleAssignment}>
          <label>Patient<select value={assignment.patientId} onChange={(event) => setAssignment({ ...assignment, patientId: event.target.value })} required><option value="">Select patient</option>{options.patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.user?.name || patient.user?.email}</option>)}</select></label>
          <label>Exercise<select value={assignment.exerciseId} onChange={(event) => setAssignment({ ...assignment, exerciseId: event.target.value })} required><option value="">Select exercise</option>{options.exercises.map((exercise) => <option key={exercise._id} value={exercise._id}>{exercise.name}</option>)}</select></label>
          <label>Plan name<input value={assignment.planName} onChange={(event) => setAssignment({ ...assignment, planName: event.target.value })} placeholder="e.g. Knee recovery week 1" required /></label>
          <div className="form-grid"><label>Start date<input type="date" value={assignment.startDate} onChange={(event) => setAssignment({ ...assignment, startDate: event.target.value })} required /></label><label>End date<input type="date" value={assignment.endDate} onChange={(event) => setAssignment({ ...assignment, endDate: event.target.value })} required /></label></div>
          <label>Frequency<select value={assignment.frequency} onChange={(event) => setAssignment({ ...assignment, frequency: event.target.value })}><option>Daily</option><option value="Every2Days">Every 2 days</option><option value="EveryOtherDay">Every other day</option><option>Twice</option><option>Weekly</option></select></label>
          <button className="primary-btn" disabled={saving || !options.patients.length}>{saving ? 'Assigning...' : 'Assign exercise'}</button>
        </form></section>
      </div>
      <section className="management-panel exercise-library"><div className="panel-heading"><div><span className="card-eyebrow">Your library</span><h3>Exercises</h3></div><span className="count-badge">{loading ? '...' : exercises.length}</span></div>
        {loading ? <div className="dashboard-loading">Loading exercises...</div> : exercises.length ? <div className="exercise-library-grid">{exercises.map((exercise) => <article className="library-item" key={exercise._id}><div className="library-item-top"><span className="exercise-category">{exercise.category}</span><span className="difficulty-tag">{exercise.difficulty}</span></div><h4>{exercise.name}</h4><p>{exercise.description}</p><div className="exercise-meta"><span>{exercise.targetBodyPart}</span><span>{exercise.duration} min</span><span>{exercise.sets} × {exercise.reps}</span></div><div className="library-actions"><button type="button" className="secondary-btn small" onClick={() => { setEditingId(exercise._id); setForm(exercise) }}>Edit</button><button type="button" className="danger-btn" onClick={() => handleDelete(exercise)}>Delete</button></div></article>)}</div> : <p className="empty-state">Create your first exercise to start building the library.</p>}
      </section>
    </div></main>
  )
}

function PatientExercisesPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState('')
  const [pain, setPain] = useState('')
  const [notes, setNotes] = useState('')

  const loadExercises = async () => {
    try { setData(await apiRequest('/exercises/patient/assigned')); setError('') } catch (loadError) { setError(loadError.message) }
  }
  useEffect(() => { loadExercises() }, [])

  const completeExercise = async (exerciseId, planId) => {
    try { await apiRequest(`/exercises/patient/${exerciseId}/complete`, { method: 'POST', body: JSON.stringify({ planId, painLevel: pain, notes }) }); setCompleting(''); setPain(''); setNotes(''); await loadExercises() } catch (completeError) { setError(completeError.message) }
  }

  if (error && !data) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!data) return <LoadingDashboard />

  const completed = new Set(data.progress.filter((item) => item.completionStatus === 'Completed').map((item) => `${item.exercise}-${item.exercisePlan}`))
  const exercises = data.plans.flatMap((plan) => plan.exercises.map((item) => ({ ...item, planId: plan._id, planName: plan.name })))
  return <main className="page-shell"><div className="container management-wrap"><div className="management-heading"><div><span className="eyebrow accent">Your movement plan</span><h2>Assigned exercises</h2><p>Follow each instruction at your own pace and record the session when you finish.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}{exercises.length ? <div className="patient-exercise-grid">{exercises.map((item) => { const exercise = item.exercise; const key = `${exercise?._id}-${item.planId}`; const isComplete = completed.has(key); return <article className="patient-exercise-card" key={key}><div className="library-item-top"><span className="exercise-category">{item.planName}</span><span className={`completion-tag ${isComplete ? 'complete' : ''}`}>{isComplete ? 'Completed' : item.frequency}</span></div><h3>{exercise?.name || 'Exercise'}</h3><p>{exercise?.description}</p><div className="exercise-meta"><span>{exercise?.targetBodyPart}</span><span>{exercise?.duration} min</span><span>{exercise?.sets} × {exercise?.reps}</span></div><div className="instruction-box"><strong>Instructions</strong><p>{exercise?.instructions}</p>{exercise?.precautions && <small>Safety: {exercise.precautions}</small>}</div>{exercise?.videoUrl && <a className="resource-link" href={exercise.videoUrl} target="_blank" rel="noreferrer">Watch exercise video</a>}{!isComplete && (completing === key ? <div className="completion-form"><label>Pain level (0-10)<input type="number" min="0" max="10" value={pain} onChange={(event) => setPain(event.target.value)} /></label><label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did it feel?" /></label><div className="form-actions"><button type="button" className="primary-btn" onClick={() => completeExercise(exercise._id, item.planId)}>Mark completed</button><button type="button" className="secondary-btn" onClick={() => setCompleting('')}>Cancel</button></div></div> : <button type="button" className="primary-btn completion-button" onClick={() => setCompleting(key)}>Mark as completed</button>)}</article> })}</div> : <div className="dashboard-panel"><p className="empty-state">Your therapist has not assigned any exercises yet.</p></div>}</div></main>
}

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('movecare-user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('movecare-user', JSON.stringify(user))
    }
  }, [user])

  const handleAuthComplete = (loggedInUser) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar user={user} onLogout={handleLogout} />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<AuthPage mode="login" onAuthComplete={handleAuthComplete} />} />
          <Route path="/register" element={<AuthPage mode="register" onAuthComplete={handleAuthComplete} />} />

          <Route element={<ProtectedRoute user={user} />}>
            <Route path="/dashboard" element={user.role === 'Patient' ? <PatientDashboardPage user={user} /> : <DashboardPage user={user} />} />
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/exercise-management" element={<ExerciseManagementPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/my-exercises" element={<PatientExercisesPage />} /></Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
