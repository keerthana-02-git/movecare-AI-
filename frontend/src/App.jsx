import { useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useSearchParams,
  useParams,
  useNavigate,
} from 'react-router-dom'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

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
              {user.role === 'Therapist' && <NavLink to="/therapist-appointments" className="secondary-btn small">Appointments</NavLink>}
              {user.role === 'Patient' && <NavLink to="/appointments" className="secondary-btn small">Appointments</NavLink>}
              {user.role === 'Therapist' && <NavLink to="/patient-progress" className="secondary-btn small">Progress</NavLink>}
              {user.role === 'Patient' && <NavLink to="/progress" className="secondary-btn small">Progress</NavLink>}
              {user.role === 'Patient' && <NavLink to="/ai-assistant" className="secondary-btn small">AI guide</NavLink>}
              {user.role === 'Therapist' && <NavLink to="/monitoring" className="secondary-btn small">Live monitor</NavLink>}
              {user.role === 'Patient' && <NavLink to="/monitoring" className="secondary-btn small">Live monitor</NavLink>}
              <NavLink to="/notifications" className="secondary-btn small">Notifications</NavLink>
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

function GoogleAuthButton({ onAuthComplete, onError, disabled }) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const tokenClientRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const submitGoogleToken = async (tokenOrCredential) => {
    setLoading(true)
    onError('')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: tokenOrCredential,
          token: tokenOrCredential,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Google authentication failed')
      }

      localStorage.setItem('movecare-token', data.token)
      localStorage.setItem('movecare-user', JSON.stringify(data.user))
      onAuthComplete(data.user)
      navigate('/dashboard')
    } catch (err) {
      onError(err.message || 'Google authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!googleClientId) return

    const initGis = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse.error) {
                setLoading(false)
                if (tokenResponse.error !== 'popup_closed_by_user') {
                  onError(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`)
                }
                return
              }
              if (tokenResponse.access_token) {
                await submitGoogleToken(tokenResponse.access_token)
              }
            },
            error_callback: (error) => {
              setLoading(false)
              if (error?.type !== 'popup_closed') {
                onError(error?.message || 'Google Sign-In was closed or interrupted.')
              }
            },
          })

          if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: async (res) => {
                if (res?.credential) {
                  await submitGoogleToken(res.credential)
                }
              },
            })
          }
        } catch (err) {
          console.warn('Google Identity Services initialization notice:', err)
        }
      }
    }

    if (window.google?.accounts?.oauth2) {
      initGis()
    } else {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existingScript) {
        existingScript.addEventListener('load', initGis)
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = initGis
        document.body.appendChild(script)
      }
    }
  }, [googleClientId])

  const handleGoogleSignIn = () => {
    onError('')

    if (!googleClientId) {
      onError('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID in frontend/.env')
      return
    }

    if (!window.google?.accounts?.oauth2) {
      onError('Google Identity Services is still loading. Please try again in a moment.')
      return
    }

    try {
      setLoading(true)
      if (!tokenClientRef.current) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setLoading(false)
              if (tokenResponse.error !== 'popup_closed_by_user') {
                onError(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`)
              }
              return
            }
            if (tokenResponse.access_token) {
              await submitGoogleToken(tokenResponse.access_token)
            }
          },
          error_callback: (error) => {
            setLoading(false)
            if (error?.type !== 'popup_closed') {
              onError(error?.message || 'Google Sign-In was closed or interrupted.')
            }
          },
        })
      }

      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      setLoading(false)
      onError(err.message || 'Failed to start Google sign-in.')
    }
  }

  return (
    <div className="google-auth-container">
      <button
        type="button"
        className="google-btn"
        onClick={handleGoogleSignIn}
        disabled={disabled || loading}
        aria-label="Continue with Google"
      >
        {loading ? (
          <div className="google-btn-spinner" aria-hidden="true" />
        ) : (
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
      </button>
    </div>
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

          {error && <div className="form-error" role="alert">{error}</div>}

          <button type="submit" className="primary-btn auth-button" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <GoogleAuthButton
            onAuthComplete={onAuthComplete}
            onError={(msg) => setError(msg)}
            disabled={loading}
          />

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

function formatElapsed(seconds = 0) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}

function LiveMonitoringCard({ role }) {
  const [value, setValue] = useState(null)
  useEffect(() => {
    const load = () => apiRequest(role === 'Therapist' ? '/monitoring/therapist/live' : '/monitoring/patient/current').then(setValue).catch(() => {})
    load()
    const interval = window.setInterval(load, 5000)
    return () => window.clearInterval(interval)
  }, [role])
  if (role === 'Therapist') {
    const count = Array.isArray(value) ? value.length : 0
    return <section className="monitoring-preview"><div><span className="card-eyebrow">Live monitoring</span><h3>{count ? `${count} active demo session${count === 1 ? '' : 's'}` : 'No active sessions'}</h3><p>Poll assigned patient sessions for exercise status and live signals.</p></div><NavLink className="secondary-btn small" to="/monitoring">Open monitor</NavLink></section>
  }
  return <section className="monitoring-preview"><div><span className="card-eyebrow">Session monitor</span><h3>{value?.status === 'Active' ? `${value.exercise?.name} in progress` : 'Start a monitored session'}</h3><p>{value?.status === 'Active' ? `${formatElapsed(value.elapsedSeconds)} elapsed · ${value.currentReps}/${value.targetReps} reps` : 'Use simulated session data to see your progress update live.'}</p></div><NavLink className="secondary-btn small" to="/monitoring">Open monitor</NavLink></section>
}

function PatientMonitoringPage() {
  const [exerciseData, setExerciseData] = useState(null)
  const [session, setSession] = useState(null)
  const [selected, setSelected] = useState('')
  const [painLevel, setPainLevel] = useState('3')
  const [mobilityScore, setMobilityScore] = useState('60')
  const [error, setError] = useState('')
  const simulationRef = useRef(null)
  const sessionRef = useRef(null)
  const painRef = useRef(painLevel)
  const mobilityRef = useRef(mobilityScore)

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { painRef.current = painLevel }, [painLevel])
  useEffect(() => { mobilityRef.current = mobilityScore }, [mobilityScore])
  useEffect(() => {
    const load = async () => {
      try {
        const [assigned, current] = await Promise.all([apiRequest('/exercises/patient/assigned'), apiRequest('/monitoring/patient/current')])
        setExerciseData(assigned); setSession(current); if (!selected && assigned.plans[0]?.exercises[0]) setSelected(`${assigned.plans[0]._id}:${assigned.plans[0].exercises[0].exercise?._id}`)
      } catch (loadError) { setError(loadError.message) }
    }
    load()
  }, [selected])
  const activeSessionId = session?._id
  const activeSessionStatus = session?.status
  useEffect(() => {
    const currentSession = sessionRef.current
    if (!currentSession || !['Active', 'Paused'].includes(currentSession.status)) return undefined
    let elapsed = currentSession.elapsedSeconds
    let reps = currentSession.currentReps
    let pain = currentSession.painLevel ?? Number(painRef.current)
    let mobility = currentSession.mobilityScore ?? Number(mobilityRef.current)
    simulationRef.current = window.setInterval(async () => {
      elapsed += 3; reps = Math.min(currentSession.targetReps, reps + 1); pain = Math.max(0, Math.min(10, pain + (reps % 4 === 0 ? 0.2 : -0.1))); mobility = Math.max(0, Math.min(100, mobility + (reps % 3 === 0 ? 1 : 0)))
      try { const updated = await apiRequest(`/monitoring/patient/${currentSession._id}`, { method: 'PATCH', body: JSON.stringify({ elapsedSeconds: elapsed, currentReps: reps, painLevel: pain.toFixed(1), mobilityScore: Math.round(mobility) }) }); setSession(updated) } catch (updateError) { setError(updateError.message) }
    }, 3000)
    return () => window.clearInterval(simulationRef.current)
  }, [activeSessionId, activeSessionStatus])

  const start = async () => {
    const [planId, exerciseId] = selected.split(':')
    try { setSession(await apiRequest('/monitoring/patient/start', { method: 'POST', body: JSON.stringify({ planId, exerciseId }) })); setError('') } catch (startError) { setError(startError.message) }
  }
  const finish = async () => {
    try { setSession(await apiRequest(`/monitoring/patient/${session._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed', painLevel, mobilityScore }) })) } catch (finishError) { setError(finishError.message) }
  }
  if (error && !exerciseData) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!exerciseData) return <LoadingDashboard />
  const options = exerciseData.plans.flatMap((plan) => plan.exercises.map((item) => ({ ...item, planId: plan._id, planName: plan.name })))
  return <main className="page-shell monitoring-page"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">Simulated demo data</span><h2>Live exercise monitor</h2><p>Watch a safe, simulated session flow update the patient and therapist views in near real time.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<section className="monitoring-stage"><div className="management-panel session-console"><div className="session-console-header"><div><span className="card-eyebrow">Exercise session</span><h3>{session?.exercise?.name || 'Choose an exercise'}</h3></div><span className={`session-status ${session?.status?.toLowerCase() || 'ready'}`}>{session?.status || 'Ready'}</span></div>{session ? <><div className="live-readings"><div><span>Elapsed</span><strong>{formatElapsed(session.elapsedSeconds)}</strong></div><div><span>Repetitions</span><strong>{session.currentReps}/{session.targetReps}</strong></div><div><span>Pain</span><strong>{session.painLevel ?? '--'}/10</strong></div><div><span>Mobility</span><strong>{session.mobilityScore ?? '--'}/100</strong></div></div><div className="session-progress"><span style={{ width: `${Math.min(100, (session.currentReps / session.targetReps) * 100)}%` }} /></div>{session.status === 'Active' && <div className="session-inputs"><label>Pain input<input type="number" min="0" max="10" value={painLevel} onChange={(event) => setPainLevel(event.target.value)} /></label><label>Mobility input<input type="number" min="0" max="100" value={mobilityScore} onChange={(event) => setMobilityScore(event.target.value)} /></label></div>}{session.status === 'Active' && <button type="button" className="primary-btn" onClick={finish}>Finish and save session</button>}{session.status === 'Completed' && <><p className="monitoring-complete">Session saved to your progress history.</p><button type="button" className="secondary-btn" onClick={() => setSession(null)}>Start another session</button></>}</> : <><label className="monitoring-select">Assigned exercise<select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Select an exercise</option>{options.map((item) => <option value={`${item.planId}:${item.exercise?._id}`} key={`${item.planId}:${item.exercise?._id}`}>{item.exercise?.name} · {item.planName}</option>)}</select></label><button type="button" className="primary-btn" onClick={start} disabled={!selected}>Start simulated session</button></>}</div><aside className="management-panel monitoring-sidebar"><span className="card-eyebrow">How this demo works</span><h3>Live signal stream</h3><p>The demo sensor generates a small update every three seconds for elapsed time, repetitions, pain, and mobility.</p><div className="demo-indicator"><span /> Simulated data active</div><p className="ai-disclaimer">This is demonstration data, not a clinical measurement or wearable device. Stop and contact your care team if exercise causes concerning symptoms.</p><NavLink className="secondary-btn small" to="/progress">View progress history</NavLink></aside></section></div></main>
}

function TherapistMonitoringPage() {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { const load = () => apiRequest('/monitoring/therapist/live').then(setSessions).catch((loadError) => setError(loadError.message)); load(); const interval = window.setInterval(load, 3000); return () => window.clearInterval(interval) }, [])
  if (error && !sessions) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!sessions) return <LoadingDashboard />
  return <main className="page-shell monitoring-page"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">Simulated demo data</span><h2>Live patient monitoring</h2><p>Monitor active exercise sessions from assigned patients. Updates refresh automatically every three seconds.</p></div>{error && <div className="form-error" role="alert">{error}</div>}{sessions.length ? <div className="live-session-grid">{sessions.map((session) => <article className="live-session-card" key={session._id}><div className="session-console-header"><div><span className="card-eyebrow">{session.patient?.user?.name}</span><h3>{session.exercise?.name}</h3></div><span className="session-status active">Live</span></div><div className="live-readings"><div><span>Elapsed</span><strong>{formatElapsed(session.elapsedSeconds)}</strong></div><div><span>Reps</span><strong>{session.currentReps}/{session.targetReps}</strong></div><div><span>Pain</span><strong>{session.painLevel ?? '--'}/10</strong></div><div><span>Mobility</span><strong>{session.mobilityScore ?? '--'}/100</strong></div></div><div className="session-progress"><span style={{ width: `${Math.min(100, (session.currentReps / session.targetReps) * 100)}%` }} /></div><small className="demo-label">Demo sensor · Updated {formatDate(session.updatedAt)}</small></article>)}</div> : <section className="management-panel"><p className="empty-state">No active patient sessions. This panel will update when a patient starts a demo session.</p></section>}</div></main>
}

function NotificationPreview() {
  const [data, setData] = useState(null)
  useEffect(() => { apiRequest('/notifications?limit=4').then(setData).catch(() => {}) }, [])
  if (!data) return null
  return <section className="notification-preview"><div><span className="card-eyebrow">Inbox</span><h3>{data.unreadCount ? `${data.unreadCount} unread notification${data.unreadCount === 1 ? '' : 's'}` : 'All caught up'}</h3><p>{data.notifications[0]?.title || 'No new updates yet.'}</p></div><NavLink className="secondary-btn small" to="/notifications">Open inbox</NavLink></section>
}

function notificationIcon(type) {
  return ({ Appointment: 'AP', ExerciseReminder: 'EX', ProgressUpdate: 'PR', Message: 'MS', NewExercisePlan: 'PL' }[type] || 'IN')
}

function NotificationsPage({ user }) {
  const [data, setData] = useState(null)
  const [options, setOptions] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [notificationType, setNotificationType] = useState('Message')
  const [patientId, setPatientId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = async () => { try { const result = await apiRequest('/notifications?limit=50'); setData(result); setError('') } catch (loadError) { setError(loadError.message) } }
  useEffect(() => { load(); if (user.role === 'Therapist') apiRequest('/exercises/assignment-options').then((result) => setOptions(result.patients)).catch(() => {}) }, [user.role])
  const markRead = async (id) => { try { await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }); await load() } catch (readError) { setError(readError.message) } }
  const markAllRead = async () => { try { await apiRequest('/notifications/read-all', { method: 'PATCH' }); await load() } catch (readError) { setError(readError.message) } }
  const sendMessage = async (event) => { event.preventDefault(); try { setSending(true); await apiRequest('/notifications/messages', { method: 'POST', body: JSON.stringify({ patientId, title, message, type: notificationType }) }); setTitle(''); setMessage(''); setPatientId(''); setNotificationType('Message'); setNotice(notificationType === 'ExerciseReminder' ? 'Exercise reminder sent.' : 'Message sent.'); } catch (sendError) { setError(sendError.message) } finally { setSending(false) } }
  if (error && !data) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!data) return <LoadingDashboard />
  return <main className="page-shell notifications-page"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">MoveCare inbox</span><h2>Notifications</h2><p>Keep track of exercise reminders, appointments, progress updates, and care-team messages.</p></div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}<div className="notifications-layout"><section className="management-panel"><div className="panel-heading"><div><span className="card-eyebrow">Your updates</span><h3>{data.unreadCount} unread</h3></div>{data.unreadCount > 0 && <button className="secondary-btn small" type="button" onClick={markAllRead}>Mark all read</button>}</div>{data.notifications.length ? <div className="inbox-list">{data.notifications.map((notification) => <article className={`inbox-item ${notification.isRead ? '' : 'unread'}`} key={notification._id}><div className="notification-icon">{notificationIcon(notification.type)}</div><div className="inbox-content"><div className="inbox-title"><strong>{notification.title}</strong><span>{notification.priority}</span></div><p>{notification.message}</p><small>{formatDate(notification.createdAt)} · {notification.type}</small></div>{!notification.isRead && <button type="button" className="read-btn" onClick={() => markRead(notification._id)}>Mark read</button>}</article>)}</div> : <p className="empty-state">No notifications yet.</p>}</section>{user.role === 'Therapist' && <section className="management-panel message-panel"><span className="card-eyebrow">Care team</span><h3>Send a patient update</h3><p>Send a simple update or exercise reminder that will appear in the patient&apos;s inbox.</p><form className="message-form" onSubmit={sendMessage}><label>Patient<select value={patientId} onChange={(event) => setPatientId(event.target.value)} required><option value="">Select patient</option>{options.map((patient) => <option value={patient._id} key={patient._id}>{patient.user?.name}</option>)}</select></label><label>Type<select value={notificationType} onChange={(event) => setNotificationType(event.target.value)}><option value="Message">Therapist message</option><option value="ExerciseReminder">Exercise reminder</option></select></label><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Progress check-in" required /></label><label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a short care update" required /></label><button className="primary-btn" disabled={sending}>{sending ? 'Sending...' : 'Send update'}</button></form></section>}</div></div></main>
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
        {user.role === 'Therapist' && <LiveMonitoringCard role="Therapist" />}
        {user.role !== 'Patient' && <NotificationPreview />}
      </div>
    </main>
  )
}

function AdminDashboardPage({ user }) {
  const [data, setData] = useState(null)
  const [view, setView] = useState('users')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    try { setData(await apiRequest('/admin/overview')); setError('') } catch (loadError) { setError(loadError.message) }
  }

  useEffect(() => { load() }, [])

  const update = async (path, options, message) => {
    try { await apiRequest(path, options); setNotice(message); await load() } catch (updateError) { setError(updateError.message) }
  }

  const removeExercise = async (exercise) => {
    if (!window.confirm(`Delete ${exercise.name}?`)) return
    await update(`/admin/exercises/${exercise._id}`, { method: 'DELETE' }, 'Exercise deleted.')
  }

  if (error && !data) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert"><strong>We could not load the admin dashboard.</strong><p>{error}. Please try again shortly.</p></div></div></main>
  if (!data) return <LoadingDashboard />

  const tabs = [
    ['users', 'Users'], ['therapists', 'Therapists'], ['exercises', 'Exercises'], ['appointments', 'Appointments'],
  ]
  return <main className="page-shell admin-page"><div className="container management-wrap">
    <div className="dashboard-hero"><div><span className="eyebrow accent">Administration</span><h2>Good to see you, {user.name.split(' ')[0]}.</h2><p>Manage access, care operations, and platform activity from one workspace.</p></div><div className="dashboard-avatar" aria-hidden="true">{user.name.charAt(0)}</div></div>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
    <div className="admin-stat-grid"><ProgressMetric label="Total users" value={data.stats.users} /><ProgressMetric label="Patients" value={data.stats.patients} /><ProgressMetric label="Therapists" value={data.stats.therapists} /><ProgressMetric label="Available therapists" value={data.stats.availableTherapists} /><ProgressMetric label="Active plans" value={data.stats.activePlans} /><ProgressMetric label="Appointments" value={data.stats.appointments} /></div>
    <section className="management-panel admin-workspace"><div className="admin-tabs" role="tablist" aria-label="Administration sections">{tabs.map(([key, label]) => <button type="button" role="tab" aria-selected={view === key} className={view === key ? 'admin-tab active' : 'admin-tab'} key={key} onClick={() => setView(key)}>{label}<span>{key === 'users' ? data.users.length : key === 'therapists' ? data.therapists.length : key === 'exercises' ? data.exercises.length : data.appointments.length}</span></button>)}</div>
      {view === 'users' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Manage</th></tr></thead><tbody>{data.users.map((item) => <tr key={item._id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td><span className="role-tag">{item.role}</span></td><td>{formatDate(item.createdAt)}</td><td><select value={item.role} onChange={(event) => update(`/admin/users/${item._id}/role`, { method: 'PATCH', body: JSON.stringify({ role: event.target.value }) }, 'User role updated.')}><option>Patient</option><option>Therapist</option><option>Admin</option></select></td></tr>)}</tbody></table></div>}
      {view === 'therapists' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Therapist</th><th>Specialization</th><th>Patients</th><th>Status</th></tr></thead><tbody>{data.therapists.map((item) => <tr key={item._id}><td><strong>{item.user?.name}</strong><small>{item.user?.email} · {item.licenseNumber}</small></td><td>{item.specialization}</td><td>{item.patientsAssigned?.length || 0}</td><td><select value={item.status} onChange={(event) => update(`/admin/therapists/${item._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: event.target.value }) }, 'Therapist status updated.')}><option>Available</option><option>Unavailable</option><option>OnLeave</option></select></td></tr>)}</tbody></table></div>}
      {view === 'exercises' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Exercise</th><th>Category</th><th>Difficulty</th><th>Created by</th><th>Manage</th></tr></thead><tbody>{data.exercises.map((item) => <tr key={item._id}><td><strong>{item.name}</strong><small>{item.targetBodyPart} · {item.duration} min</small></td><td>{item.category}</td><td>{item.difficulty}</td><td>{item.createdBy?.user?.name || 'Unknown'}</td><td><button type="button" className="danger-btn" onClick={() => removeExercise(item)}>Delete</button></td></tr>)}</tbody></table></div>}
      {view === 'appointments' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Patient</th><th>Therapist</th><th>Type</th><th>Status</th></tr></thead><tbody>{data.appointments.map((item) => <tr key={item._id}><td><strong>{formatDate(item.appointmentDate)}</strong><small>{item.startTime} - {item.endTime}</small></td><td>{item.patient?.user?.name || 'Unknown'}</td><td>{item.therapist?.user?.name || 'Unknown'}</td><td>{item.type}</td><td><AppointmentStatus status={item.status} /></td></tr>)}</tbody></table>{!data.appointments.length && <p className="empty-state">No appointments recorded yet.</p>}</div>}
    </section>
  </div></main>
}

function TherapistDashboardPage({ user }) {
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    try {
      const [patients, appointments, options, recommendations] = await Promise.all([
        apiRequest('/progress/patients'), apiRequest('/appointments/therapist'),
        apiRequest('/exercises/assignment-options'), apiRequest('/ai/therapist/recommendations'),
      ])
      setData({ patients, appointments, options, recommendations })
      setSelectedId((current) => current || patients[0]?.patient?._id || '')
      setError('')
    } catch (loadError) { setError(loadError.message) }
  }

  useEffect(() => { loadDashboard() }, [])

  const manageAppointment = async (appointment, status) => {
    try { await apiRequest(`/appointments/${appointment._id}/manage`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadDashboard() } catch (manageError) { setError(manageError.message) }
  }

  if (error && !data) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert"><strong>We could not load your therapist workspace.</strong><p>{error}. Please try again shortly.</p></div></div></main>
  if (!data) return <LoadingDashboard />

  const today = new Date()
  const selected = data.patients.find((item) => item.patient._id === selectedId)
  const upcoming = data.appointments.filter((item) => new Date(item.appointmentDate) >= today && !['Cancelled', 'NoShow'].includes(item.status)).slice(0, 4)
  const history = data.appointments.filter((item) => new Date(item.appointmentDate) < today || ['Cancelled', 'NoShow'].includes(item.status)).slice().reverse().slice(0, 5)
  const averageAdherence = data.patients.length ? Math.round(data.patients.reduce((total, item) => total + item.summary.exerciseAdherence, 0) / data.patients.length) : 0

  return <main className="page-shell dashboard-page therapist-dashboard-page"><div className="container management-wrap">
    <div className="dashboard-hero"><div><span className="eyebrow accent">Therapist workspace</span><h2>Good to see you, {user.name.split(' ')[0]}.</h2><p>Your assigned caseload, schedule, and clinical signals in one place.</p></div><div className="dashboard-avatar" aria-hidden="true">{user.name.charAt(0)}</div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="therapist-stat-grid"><ProgressMetric label="Assigned patients" value={data.patients.length} /><ProgressMetric label="Upcoming consultations" value={upcoming.length} /><ProgressMetric label="Pending requests" value={data.appointments.filter((item) => item.status === 'Scheduled').length} /><ProgressMetric label="Average adherence" value={averageAdherence} suffix="%" /></div>
    <div className="therapist-dashboard-grid">
      <section className="management-panel patient-directory"><div className="panel-heading"><div><span className="card-eyebrow">Care roster</span><h3>Assigned patients</h3></div><span className="count-badge">{data.patients.length}</span></div>{data.patients.length ? data.patients.map((item) => <button type="button" className={`patient-progress-option ${selectedId === item.patient._id ? 'selected' : ''}`} key={item.patient._id} onClick={() => setSelectedId(item.patient._id)}><span className="therapist-initial">{item.patient.user?.name?.charAt(0)}</span><span><strong>{item.patient.user?.name}</strong><small>{item.patient.medicalCondition} · {item.summary.exerciseAdherence}% adherence</small></span></button>) : <p className="empty-state">No assigned patients found.</p>}</section>
      <section className="management-panel patient-profile-card"><div className="panel-heading"><div><span className="card-eyebrow">Patient profile</span><h3>{selected?.patient.user?.name || 'Select a patient'}</h3></div>{selected && <NavLink className="secondary-btn small" to={`/patient-progress?patient=${selected.patient._id}`}>View progress</NavLink>}</div>{selected ? <><dl className="profile-list"><div><dt>Condition</dt><dd>{selected.patient.medicalCondition}</dd></div><div><dt>Injury</dt><dd>{selected.patient.injuryDescription || 'Not recorded'}</dd></div><div><dt>Date of birth</dt><dd>{formatDate(selected.patient.dateOfBirth)}</dd></div><div><dt>Status</dt><dd>{selected.patient.status}</dd></div><div><dt>Email</dt><dd>{selected.patient.user?.email}</dd></div></dl><div className="profile-stat-row"><span><strong>{selected.summary.exerciseAdherence}%</strong> adherence</span><span><strong>{selected.summary.mobilityScore ?? '--'}</strong> mobility</span><span><strong>{selected.summary.averagePain ?? '--'}</strong> pain</span></div></> : <p className="empty-state">Select an assigned patient to review their profile.</p>}</section>
    </div>
    <div className="therapist-dashboard-grid lower"><section className="management-panel"><div className="panel-heading"><div><span className="card-eyebrow">Today and next</span><h3>Upcoming consultations</h3></div><NavLink className="secondary-btn small" to="/therapist-appointments">Manage schedule</NavLink></div>{upcoming.length ? <div className="appointment-list">{upcoming.map((appointment) => <article className="dashboard-appointment" key={appointment._id}><div><strong>{appointment.patient?.user?.name}</strong><span>{formatDate(appointment.appointmentDate)} · {appointment.startTime} - {appointment.endTime}</span><small>{appointment.type}</small></div><div className="appointment-actions">{appointment.status === 'Scheduled' && <button className="primary-btn small" type="button" onClick={() => manageAppointment(appointment, 'Accepted')}>Accept</button>}<AppointmentStatus status={appointment.status} /></div></article>)}</div> : <p className="empty-state">No upcoming consultations.</p>}</section>
      <section className="management-panel"><div className="panel-heading"><div><span className="card-eyebrow">Care history</span><h3>Recent consultations</h3></div></div>{history.length ? <div className="appointment-list">{history.map((appointment) => <article className="dashboard-appointment" key={appointment._id}><div><strong>{appointment.patient?.user?.name}</strong><span>{formatDate(appointment.appointmentDate)} · {appointment.type}</span></div><AppointmentStatus status={appointment.status} /></article>)}</div> : <p className="empty-state">No consultation history yet.</p>}</section></div>
    <section className="therapist-tools"><div className="tool-heading"><div><span className="eyebrow accent">Clinical tools</span><h3>Keep care moving</h3></div><div className="tool-actions"><NavLink className="primary-btn small" to="/exercise-management">Create or assign exercises</NavLink><NavLink className="secondary-btn small" to="/patient-progress">Review all progress</NavLink></div></div><div className="tool-summary"><span><strong>{data.options.exercises.length}</strong> exercises in your library</span><span><strong>{data.options.patients.length}</strong> patients ready for assignment</span><NavLink className="secondary-btn small" to="/monitoring">Open live monitor</NavLink></div></section>
    <section className="ai-recommendation-panel therapist-ai-panel"><div className="ai-panel-heading"><div><span className="card-eyebrow">Decision support</span><h3>AI recommendation review</h3><p>Review exercise suggestions generated from each patient&apos;s recorded condition, pain, mobility, and history.</p></div><span className="ai-badge">For clinician review</span></div>{data.recommendations.length ? <div className="therapist-recommendation-grid">{data.recommendations.map((review) => <article className="therapist-recommendation" key={review.patient._id}><div className="recommendation-title"><strong>{review.patient.user?.name}</strong><span>{review.inputProfile.condition}</span></div><p>{review.recommendations[0]?.exercise?.name || 'No matching exercise yet'}{review.recommendations[0] ? ` · ${review.recommendations[0].reason}` : ' · Build the library to generate suggestions.'}</p><div className="recommendation-meta"><span>{review.plan.difficulty}</span><span>{review.plan.duration} min</span><span>{review.plan.frequency}</span></div></article>)}</div> : <p className="empty-state">No assigned patients available for recommendations.</p>}<p className="ai-disclaimer">AI suggestions support clinician review and do not replace professional assessment or treatment decisions.</p></section>
  </div></main>
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

function RecommendationPanel() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { apiRequest('/ai/recommendations').then(setData).catch((loadError) => setError(loadError.message)) }, [])
  return <section className="ai-recommendation-panel"><div className="ai-panel-heading"><div><span className="card-eyebrow">MoveCare AI feature</span><h3>Personalized exercise recommendations</h3><p>Suggestions are generated from your recorded condition, age, pain, mobility, and exercise history.</p></div><span className="ai-badge">AI guide</span></div>{error && <div className="ai-inline-error">{error}</div>}{!data && !error && <div className="ai-loading">Reviewing your care data...</div>}{data && <><div className="ai-inputs"><span>Condition: <strong>{data.inputProfile.condition}</strong></span><span>Age: <strong>{data.inputProfile.age}</strong></span><span>Pain: <strong>{data.inputProfile.painLevel === null ? 'Not recorded' : `${data.inputProfile.painLevel}/10`}</strong></span><span>Mobility: <strong>{data.inputProfile.mobilityLevel === null ? 'Not recorded' : `${data.inputProfile.mobilityLevel}/100`}</strong></span></div><div className="recommendation-list">{data.recommendations.length ? data.recommendations.map((item) => <article className="recommendation-item" key={item.exercise._id}><div><div className="recommendation-title"><strong>{item.exercise.name}</strong>{item.alreadyAssigned && <span className="assigned-tag">In your plan</span>}</div><p>{item.reason}</p></div><div className="recommendation-meta"><span>{item.suggestedDifficulty}</span><span>{item.suggestedDuration} min</span><span>{item.suggestedFrequency}</span></div></article>) : <p className="empty-state">Your exercise library does not have a matching suggestion yet.</p>}</div><p className="ai-disclaimer">{data.disclaimer}</p></>}</section>
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
        <LiveMonitoringCard role="Patient" />
        <RecommendationPanel />
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
  const [mobilityScore, setMobilityScore] = useState('')
  const [notes, setNotes] = useState('')

  const loadExercises = async () => {
    try { setData(await apiRequest('/exercises/patient/assigned')); setError('') } catch (loadError) { setError(loadError.message) }
  }
  useEffect(() => { loadExercises() }, [])

  const completeExercise = async (exerciseId, planId) => {
    try { await apiRequest(`/exercises/patient/${exerciseId}/complete`, { method: 'POST', body: JSON.stringify({ planId, painLevel: pain, mobilityScore, notes }) }); setCompleting(''); setPain(''); setMobilityScore(''); setNotes(''); await loadExercises() } catch (completeError) { setError(completeError.message) }
  }

  if (error && !data) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!data) return <LoadingDashboard />

  const completed = new Set(data.progress.filter((item) => item.completionStatus === 'Completed').map((item) => `${item.exercise}-${item.exercisePlan}`))
  const exercises = data.plans.flatMap((plan) => plan.exercises.map((item) => ({ ...item, planId: plan._id, planName: plan.name })))
  return <main className="page-shell"><div className="container management-wrap"><div className="management-heading"><div><span className="eyebrow accent">Your movement plan</span><h2>Assigned exercises</h2><p>Follow each instruction at your own pace and record the session when you finish.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}{exercises.length ? <div className="patient-exercise-grid">{exercises.map((item) => { const exercise = item.exercise; const key = `${exercise?._id}-${item.planId}`; const isComplete = completed.has(key); return <article className="patient-exercise-card" key={key}><div className="library-item-top"><span className="exercise-category">{item.planName}</span><span className={`completion-tag ${isComplete ? 'complete' : ''}`}>{isComplete ? 'Completed' : item.frequency}</span></div><h3>{exercise?.name || 'Exercise'}</h3><p>{exercise?.description}</p><div className="exercise-meta"><span>{exercise?.targetBodyPart}</span><span>{exercise?.duration} min</span><span>{exercise?.sets} × {exercise?.reps}</span></div><div className="instruction-box"><strong>Instructions</strong><p>{exercise?.instructions}</p>{exercise?.precautions && <small>Safety: {exercise.precautions}</small>}</div>{exercise?.videoUrl && <a className="resource-link" href={exercise.videoUrl} target="_blank" rel="noreferrer">Watch exercise video</a>}{!isComplete && (completing === key ? <div className="completion-form"><label>Pain level (0-10)<input type="number" min="0" max="10" value={pain} onChange={(event) => setPain(event.target.value)} /></label><label>Mobility score (0-100)<input type="number" min="0" max="100" value={mobilityScore} onChange={(event) => setMobilityScore(event.target.value)} /></label><label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did it feel?" /></label><div className="form-actions"><button type="button" className="primary-btn" onClick={() => completeExercise(exercise._id, item.planId)}>Mark completed</button><button type="button" className="secondary-btn" onClick={() => setCompleting('')}>Cancel</button></div></div> : <button type="button" className="primary-btn completion-button" onClick={() => setCompleting(key)}>Mark as completed</button>)}</article> })}</div> : <div className="dashboard-panel"><p className="empty-state">Your therapist has not assigned any exercises yet.</p></div>}</div></main>
}

function ProgressChart({ data, dataKey, color, max = 100, emptyLabel }) {
  if (!data.length) return <div className="chart-empty">{emptyLabel}</div>
  const width = 640
  const height = 210
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width
    const value = item[dataKey] === null || item[dataKey] === undefined ? 0 : item[dataKey]
    const y = height - (Math.min(max, value) / max) * height
    return `${x},${y}`
  }).join(' ')
  return <div className="progress-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${dataKey} over time`} preserveAspectRatio="none"><line x1="0" y1="0" x2={width} y2="0" /><line x1="0" y1={height / 2} x2={width} y2={height / 2} /><line x1="0" y1={height} x2={width} y2={height} /><polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="chart-labels"><span>{formatDate(data[0].date)}</span><span>{formatDate(data[data.length - 1].date)}</span></div></div>
}

function ProgressMetric({ label, value, suffix = '' }) {
  return <div className="progress-metric"><span>{label}</span><strong>{value === null || value === undefined ? '--' : `${value}${suffix}`}</strong></div>
}

function PatientProgressPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { apiRequest('/progress/me').then(setData).catch((loadError) => setError(loadError.message)) }, [])
  if (error) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!data) return <LoadingDashboard />
  const { summary, timeline, entries } = data
  return <main className="page-shell progress-page"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">Your recovery data</span><h2>Progress tracking</h2><p>See how your exercise routine, pain, mobility, and attendance are changing over time.</p></div><div className="progress-metrics"><ProgressMetric label="Exercise adherence" value={summary.exerciseAdherence} suffix="%" /><ProgressMetric label="Completed sessions" value={summary.completedSessions} /><ProgressMetric label="Mobility score" value={summary.mobilityScore} suffix="/100" /><ProgressMetric label="Appointment attendance" value={summary.appointmentAttendance} suffix="%" /><ProgressMetric label="Average pain" value={summary.averagePain} suffix="/10" /></div><div className="progress-chart-grid"><section className="management-panel chart-panel"><div className="panel-heading"><div><span className="card-eyebrow">Consistency</span><h3>Exercise completion</h3></div></div><ProgressChart data={timeline} dataKey="completionRate" color="#0d8b85" emptyLabel="Complete an exercise to begin your timeline." /></section><section className="management-panel chart-panel"><div className="panel-heading"><div><span className="card-eyebrow">Movement signal</span><h3>Mobility score</h3></div></div><ProgressChart data={timeline.filter((item) => item.mobilityScore !== null)} dataKey="mobilityScore" color="#2b77d1" emptyLabel="Add a mobility score when completing an exercise." /></section><section className="management-panel chart-panel"><div className="panel-heading"><div><span className="card-eyebrow">Comfort signal</span><h3>Pain level</h3></div></div><ProgressChart data={timeline.filter((item) => item.pain !== null)} dataKey="pain" color="#e28a3d" max={10} emptyLabel="Add a pain level when completing an exercise." /></section></div><section className="management-panel"><div className="panel-heading"><div><span className="card-eyebrow">Session history</span><h3>Recent sessions</h3></div></div>{entries.length ? <div className="progress-table">{entries.slice().reverse().slice(0, 12).map((entry) => <div className="progress-table-row" key={entry._id}><span>{formatDate(entry.datePerformed)}</span><strong>{entry.exercise?.name || 'Exercise'}</strong><span className="completion-tag complete">{entry.completionStatus}</span><span>{entry.mobilityScore === undefined ? '--' : `${entry.mobilityScore}/100`} mobility</span><span>{entry.painLevel === undefined ? '--' : `${entry.painLevel}/10`} pain</span></div>)}</div> : <p className="empty-state">No progress sessions recorded yet.</p>}</section></div></main>
}

function AssistantPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'I can help explain your MoveCare exercise suggestions, progress, and appointments.' }])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sendMessage = async (event) => {
    event.preventDefault()
    if (!message.trim()) return
    const currentMessage = message.trim()
    setMessages((current) => [...current, { role: 'user', text: currentMessage }]); setMessage(''); setLoading(true); setError('')
    try { const response = await apiRequest('/ai/assistant', { method: 'POST', body: JSON.stringify({ message: currentMessage }) }); setMessages((current) => [...current, { role: 'assistant', text: response.answer }]) } catch (sendError) { setError(sendError.message) } finally { setLoading(false) }
  }
  return <main className="page-shell assistant-page"><div className="container assistant-wrap"><div className="management-heading"><span className="eyebrow accent">MoveCare AI feature</span><h2>Recovery assistant</h2><p>A simple software guide for understanding your dashboard. It does not diagnose conditions or replace your care team.</p></div><section className="assistant-panel"><div className="assistant-messages">{messages.map((item, index) => <div className={`assistant-message ${item.role}`} key={`${item.role}-${index}`}><span>{item.role === 'assistant' ? 'AI guide' : 'You'}</span><p>{item.text}</p></div>)}</div>{error && <div className="form-error" role="alert">{error}</div>}<form className="assistant-form" onSubmit={sendMessage}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about progress, exercises, or appointments" aria-label="Ask the recovery assistant" /><button className="primary-btn" disabled={loading}>{loading ? 'Thinking...' : 'Send'}</button></form><p className="ai-disclaimer">This assistant provides general software guidance only. Contact a licensed healthcare professional for medical questions or urgent concerns.</p></section></div></main>
}

function TherapistProgressPage() {
  const [patients, setPatients] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  useEffect(() => { apiRequest('/progress/patients').then((data) => { setPatients(data); const requestedId = searchParams.get('patient'); setSelectedId(data.some((item) => item.patient._id === requestedId) ? requestedId : data[0]?.patient?._id || '') }).catch((loadError) => setError(loadError.message)) }, [searchParams])
  useEffect(() => { if (selectedId) apiRequest(`/progress/patients/${selectedId}`).then(setDetail).catch((loadError) => setError(loadError.message)) }, [selectedId])
  if (error && !patients) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!patients) return <LoadingDashboard />
  return <main className="page-shell"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">Therapist workspace</span><h2>Patient progress</h2><p>Review adherence, session signals, and attendance for your assigned patients.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="therapist-progress-layout"><section className="management-panel patient-progress-list"><h3>Assigned patients</h3>{patients.length ? patients.map((item) => <button type="button" className={`patient-progress-option ${selectedId === item.patient._id ? 'selected' : ''}`} key={item.patient._id} onClick={() => setSelectedId(item.patient._id)}><span className="therapist-initial">{item.patient.user?.name?.charAt(0)}</span><span><strong>{item.patient.user?.name}</strong><small>{item.summary.exerciseAdherence}% adherence · {item.summary.completedSessions} sessions</small></span></button>) : <p className="empty-state">No assigned patients found.</p>}</section>{detail ? <section className="patient-progress-detail"><div className="progress-detail-heading"><div><span className="eyebrow accent">Patient record</span><h3>{detail.patient.user?.name}</h3><p>{detail.patient.medicalCondition}</p></div></div><div className="progress-metrics"><ProgressMetric label="Adherence" value={detail.summary.exerciseAdherence} suffix="%" /><ProgressMetric label="Completed" value={detail.summary.completedSessions} /><ProgressMetric label="Mobility" value={detail.summary.mobilityScore} suffix="/100" /><ProgressMetric label="Attendance" value={detail.summary.appointmentAttendance} suffix="%" /></div><div className="progress-chart-grid"><section className="management-panel chart-panel"><h3>Completion trend</h3><ProgressChart data={detail.timeline} dataKey="completionRate" color="#0d8b85" emptyLabel="No completion data yet." /></section><section className="management-panel chart-panel"><h3>Mobility trend</h3><ProgressChart data={detail.timeline.filter((item) => item.mobilityScore !== null)} dataKey="mobilityScore" color="#2b77d1" emptyLabel="No mobility data yet." /></section></div></section> : <div className="management-panel"><p className="empty-state">Select a patient to view progress.</p></div>}</div></div></main>
}

function AppointmentStatus({ status }) {
  return <span className={`appointment-status ${status.toLowerCase()}`}>{status}</span>
}

function ConsultationLink({ appointment }) {
  if (!['Scheduled', 'Accepted', 'InProgress'].includes(appointment.status)) return null
  return <NavLink className="secondary-btn small" to={`/consultation/${appointment._id}`}>Open consultation</NavLink>
}

function PatientAppointmentsPage() {
  const [therapists, setTherapists] = useState([])
  const [appointments, setAppointments] = useState([])
  const [therapistId, setTherapistId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [booking, setBooking] = useState({ startTime: '', endTime: '', type: 'Treatment Session', notes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAppointments = async () => setAppointments(await apiRequest('/appointments/patient'))
  useEffect(() => {
    const load = async () => {
      try { setLoading(true); const [therapistData, appointmentData] = await Promise.all([apiRequest('/appointments/therapists'), apiRequest('/appointments/patient')]); setTherapists(therapistData); setAppointments(appointmentData) } catch (loadError) { setError(loadError.message) } finally { setLoading(false) }
    }
    load()
  }, [])
  useEffect(() => {
    if (!therapistId || !date) { setSlots([]); return }
    apiRequest(`/appointments/therapists/${therapistId}/slots?date=${date}`).then(setSlots).catch((slotError) => setError(slotError.message))
  }, [therapistId, date])

  const book = async (event) => {
    event.preventDefault()
    try { setSaving(true); setError(''); setNotice(''); await apiRequest('/appointments', { method: 'POST', body: JSON.stringify({ therapistId, date, ...booking }) }); await loadAppointments(); setBooking({ startTime: '', endTime: '', type: 'Treatment Session', notes: '' }); setSlots([]); setNotice('Your virtual consultation is booked.') } catch (bookError) { setError(bookError.message) } finally { setSaving(false) }
  }
  const cancel = async (appointment) => {
    if (!window.confirm('Cancel this appointment?')) return
    try { await apiRequest(`/appointments/${appointment._id}/cancel`, { method: 'PATCH', body: JSON.stringify({}) }); await loadAppointments(); setNotice('Appointment cancelled.') } catch (cancelError) { setError(cancelError.message) }
  }

  return <main className="page-shell"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">Virtual care</span><h2>Appointments</h2><p>Choose a therapist and a time that works for your recovery.</p></div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}<div className="appointment-layout"><section className="management-panel"><h3>Book a consultation</h3><form className="appointment-form" onSubmit={book}><label>Therapist<select value={therapistId} onChange={(event) => { setTherapistId(event.target.value); setBooking({ ...booking, startTime: '', endTime: '' }) }} required><option value="">Select therapist</option>{therapists.map((therapist) => <option key={therapist._id} value={therapist._id}>{therapist.user?.name} · {therapist.specialization}</option>)}</select></label><label>Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => { setDate(event.target.value); setBooking({ ...booking, startTime: '', endTime: '' }) }} required /></label><label>Available time<select value={booking.startTime} onChange={(event) => { const slot = slots.find((item) => item.startTime === event.target.value); setBooking({ ...booking, startTime: slot?.startTime || '', endTime: slot?.endTime || '' }) }} required><option value="">{slots.length ? 'Select a slot' : 'Choose therapist and date first'}</option>{slots.map((slot) => <option key={slot.startTime} value={slot.startTime}>{slot.startTime} - {slot.endTime}</option>)}</select></label><label>Visit type<select value={booking.type} onChange={(event) => setBooking({ ...booking, type: event.target.value })}><option>Initial Assessment</option><option>Follow-up</option><option>Progress Review</option><option>Treatment Session</option></select></label><label>Notes<textarea value={booking.notes} onChange={(event) => setBooking({ ...booking, notes: event.target.value })} placeholder="What would you like to discuss?" /></label><button className="primary-btn" disabled={saving}>{saving ? 'Booking...' : 'Book virtual consultation'}</button></form></section><section className="management-panel therapist-profile-panel"><h3>Available therapists</h3>{therapists.length ? therapists.map((therapist) => <div className="therapist-option" key={therapist._id}><div className="therapist-initial">{therapist.user?.name?.charAt(0)}</div><div><strong>{therapist.user?.name}</strong><span>{therapist.specialization}</span><small>{therapist.yearsOfExperience} years experience</small></div></div>) : <p className="empty-state">No therapists are available right now.</p>}</section></div><section className="management-panel appointment-list-panel"><div className="panel-heading"><div><span className="card-eyebrow">Your schedule</span><h3>Upcoming and past appointments</h3></div></div>{loading ? <div className="dashboard-loading">Loading appointments...</div> : appointments.length ? <div className="appointment-list">{appointments.map((appointment) => <article className="appointment-row" key={appointment._id}><div className="appointment-date"><strong>{formatDate(appointment.appointmentDate)}</strong><span>{appointment.startTime} - {appointment.endTime}</span></div><div className="appointment-main"><strong>{appointment.therapist?.user?.name}</strong><span>{appointment.type} · {appointment.consultationMode}</span><small>{appointment.location}</small></div><AppointmentStatus status={appointment.status} /><div className="appointment-actions"><ConsultationLink appointment={appointment}/>{['Scheduled', 'Accepted'].includes(appointment.status) && <button className="danger-btn" type="button" onClick={() => cancel(appointment)}>Cancel</button>}</div></article>)}</div> : <p className="empty-state">No appointments yet. Book your first consultation above.</p>}</section></div></main>
}

function TherapistAppointmentsPage() {
  const [appointments, setAppointments] = useState(null)
  const [error, setError] = useState('')
  const load = async () => { try { setAppointments(await apiRequest('/appointments/therapist')) } catch (loadError) { setError(loadError.message) } }
  useEffect(() => { load() }, [])
  const manage = async (appointment, status) => { try { await apiRequest(`/appointments/${appointment._id}/manage`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load() } catch (manageError) { setError(manageError.message) } }
  if (error && !appointments) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!appointments) return <LoadingDashboard />
  return <main className="page-shell"><div className="container management-wrap"><div className="management-heading"><span className="eyebrow accent">Therapist workspace</span><h2>Appointment schedule</h2><p>Confirm visits, manage the day, and open the consultation room when it is time.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<section className="management-panel appointment-list-panel"><div className="appointment-list">{appointments.length ? appointments.map((appointment) => <article className="appointment-row" key={appointment._id}><div className="appointment-date"><strong>{formatDate(appointment.appointmentDate)}</strong><span>{appointment.startTime} - {appointment.endTime}</span></div><div className="appointment-main"><strong>{appointment.patient?.user?.name}</strong><span>{appointment.patient?.medicalCondition}</span><small>{appointment.type} · {appointment.consultationMode}</small></div><AppointmentStatus status={appointment.status}/><div className="appointment-actions">{appointment.status === 'Scheduled' && <button className="primary-btn small" type="button" onClick={() => manage(appointment, 'Accepted')}>Accept</button>}{appointment.status === 'Accepted' && <button className="primary-btn small" type="button" onClick={() => manage(appointment, 'InProgress')}>Start</button>}<ConsultationLink appointment={appointment}/>{['Scheduled', 'Accepted'].includes(appointment.status) && <button className="danger-btn" type="button" onClick={() => manage(appointment, 'Cancelled')}>Decline</button>}</div></article>) : <p className="empty-state">No appointments are scheduled.</p>}</div></section></div></main>
}

function ConsultationPage({ user }) {
  const { id } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [error, setError] = useState('')
  const [mutating, setMutating] = useState(false)
  useEffect(() => { apiRequest(`/appointments/${id}/consultation`).then(setAppointment).catch((loadError) => setError(loadError.message)) }, [id])
  const updateStatus = async (consultationStatus) => { try { setMutating(true); const updated = await apiRequest(`/appointments/${id}/consultation`, { method: 'PATCH', body: JSON.stringify({ consultationStatus }) }); setAppointment((current) => ({ ...current, ...updated })) } catch (statusError) { setError(statusError.message) } finally { setMutating(false) } }
  if (error) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  if (!appointment) return <LoadingDashboard />
  const otherPerson = user.role === 'Therapist' ? appointment.patient?.user?.name : appointment.therapist?.user?.name
  return <main className="page-shell consultation-page"><div className="container consultation-wrap"><NavLink className="back-link" to={user.role === 'Therapist' ? '/therapist-appointments' : '/appointments'}>Back to appointments</NavLink><div className="consultation-header"><div><span className="eyebrow accent">MoveCare virtual clinic</span><h2>Consultation room</h2><p>{formatDate(appointment.appointmentDate)} · {appointment.startTime} - {appointment.endTime} · with {otherPerson}</p></div><AppointmentStatus status={appointment.consultationStatus}/></div><section className="consultation-stage"><div className="video-placeholder"><div className="video-avatar">{otherPerson?.charAt(0)}</div><strong>{otherPerson}</strong><span>{appointment.consultationStatus === 'Live' ? 'Live consultation' : 'Your secure consultation space'}</span><div className="video-controls"><button type="button" className="secondary-btn small">Mute</button><button type="button" className="secondary-btn small">Camera</button>{user.role === 'Therapist' && appointment.consultationStatus !== 'Ended' && <button type="button" className="primary-btn small" disabled={mutating} onClick={() => updateStatus(appointment.consultationStatus === 'Live' ? 'Ended' : 'Live')}>{appointment.consultationStatus === 'Live' ? 'End consultation' : 'Start consultation'}</button>}</div></div><aside className="consultation-sidebar"><h3>Visit details</h3><dl className="profile-list"><div><dt>Type</dt><dd>{appointment.type}</dd></div><div><dt>Mode</dt><dd>{appointment.consultationMode}</dd></div><div><dt>Status</dt><dd>{appointment.status}</dd></div></dl><div className="consultation-note"><strong>Demo consultation</strong><p>This professional room demonstrates the visit flow. Camera and microphone controls are visual placeholders for a future video provider.</p></div></aside></section></div></main>
}

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('movecare-user')
    try { return savedUser ? JSON.parse(savedUser) : null } catch { return null }
  })

  useEffect(() => {
    const token = localStorage.getItem('movecare-token')
    if (!token) return
    apiRequest('/auth/me').then((currentUser) => setUser(currentUser)).catch(() => {
      localStorage.removeItem('movecare-token')
      localStorage.removeItem('movecare-user')
      setUser(null)
    })
  }, [])

  useEffect(() => {
    if (user) localStorage.setItem('movecare-user', JSON.stringify(user))
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
            <Route path="/dashboard" element={user?.role === 'Patient' ? <PatientDashboardPage user={user} /> : user?.role === 'Therapist' ? <TherapistDashboardPage user={user} /> : user?.role === 'Admin' ? <AdminDashboardPage user={user} /> : <DashboardPage user={user} />} />
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/exercise-management" element={<ExerciseManagementPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/my-exercises" element={<PatientExercisesPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/therapist-appointments" element={<TherapistAppointmentsPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/appointments" element={<PatientAppointmentsPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/patient-progress" element={<TherapistProgressPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/progress" element={<PatientProgressPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/ai-assistant" element={<AssistantPage />} /></Route>
            <Route path="/monitoring" element={user?.role === 'Patient' ? <PatientMonitoringPage /> : <TherapistMonitoringPage />} />
            <Route path="/notifications" element={<NotificationsPage user={user} />} />
            <Route path="/consultation/:id" element={<ConsultationPage user={user} />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
