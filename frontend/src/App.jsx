import { useCallback, useEffect, useRef, useState } from 'react'
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
  useLocation,
} from 'react-router-dom'
import './App.css'
import RecoveryOverview from './components/dashboard/RecoveryOverview'
import RecoveryGoal from './components/dashboard/RecoveryGoal'
import TodaysExercises from './components/dashboard/TodaysExercises'
import NextAppointment from './components/dashboard/NextAppointment'
import ProgressSummary from './components/dashboard/ProgressSummary'
import ExerciseCard from './components/exercises/ExerciseCard'
import ExerciseDetailModal from './components/exercises/ExerciseDetailModal'
import ExerciseFilters from './components/exercises/ExerciseFilters'
import ProgressOverviewCard from './components/progress/ProgressOverviewCard'
import WeeklyProgressChart from './components/progress/WeeklyProgressChart'
import MonthlySummaryCard from './components/progress/MonthlySummaryCard'
import CompletionTrendChart from './components/progress/CompletionTrendChart'
import PainTrendCard from './components/progress/PainTrendCard'
import MobilityTrendCard from './components/progress/MobilityTrendCard'
import PainJournalCard from './components/journal/PainJournalCard'
import PainJournalFormModal from './components/journal/PainJournalFormModal'
import PainJournalPage from './components/journal/PainJournalPage'

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
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    let isMounted = true
    const fetchUnread = () => {
      apiRequest('/notifications/unread-count')
        .then((res) => {
          if (isMounted && typeof res?.unreadCount === 'number') {
            setUnreadCount(res.unreadCount)
          }
        })
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 20000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user])

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
              {user.role === 'Patient' && <NavLink to="/pain-journal" className="secondary-btn small">Pain journal</NavLink>}
              {user.role === 'Patient' && <NavLink to="/ai-assistant" className="secondary-btn small">AI guide</NavLink>}
              {user.role === 'Therapist' && <NavLink to="/monitoring" className="secondary-btn small">Live monitor</NavLink>}
              {user.role === 'Patient' && <NavLink to="/monitoring" className="secondary-btn small">Live monitor</NavLink>}
              <NavLink to="/notifications" className="secondary-btn small nav-notif-btn" title="View notifications and care reminders">
                🔔 <span className="nav-notif-text">Inbox</span>
                {unreadCount > 0 && <span className="nav-notif-badge">{unreadCount}</span>}
              </NavLink>
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
  const location = useLocation()
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null
  }

  return (
    <footer className="site-footer" aria-label="MoveCare AI Footer">
      <div className="footer-container">
        {/* Top Section: Properly Aligned Footer Links Grid */}
        <div className="footer-links-grid">
          {/* Column 1: Brand & Clinical Mission */}
          <div className="footer-col brand-col">
            <div className="footer-brand-header">
              <span className="footer-brand-icon" aria-hidden="true">🩺</span>
              <h3 className="footer-brand-title">MoveCare AI</h3>
            </div>
            <p className="footer-mission-text">
              Intelligent musculoskeletal rehabilitation and remote physical therapy platform with real-time clinical telemetry.
            </p>
            <div className="footer-compliance-chip">
              🛡️ HIPAA-Compliant · Clinical Telehealth
            </div>
          </div>

          {/* Column 2: Patient Care */}
          <div className="footer-col">
            <h4 className="footer-col-title">Patient Care</h4>
            <ul className="footer-nav-list">
              <li><NavLink to="/dashboard">Recovery Cockpit</NavLink></li>
              <li><NavLink to="/my-exercises">Daily Prescribed Routine</NavLink></li>
              <li><NavLink to="/pain-journal">Pain & Mobility Journal</NavLink></li>
              <li><NavLink to="/appointments">Telehealth Consultations</NavLink></li>
            </ul>
          </div>

          {/* Column 3: Clinical Intelligence */}
          <div className="footer-col">
            <h4 className="footer-col-title">AI & Intelligence</h4>
            <ul className="footer-nav-list">
              <li><NavLink to="/ai-assistant">AI Clinical Assistant</NavLink></li>
              <li><NavLink to="/monitoring">Session Telemetry Monitor</NavLink></li>
              <li><NavLink to="/notifications">Clinical Alert Center</NavLink></li>
              <li><NavLink to="/dashboard">Therapy Milestones</NavLink></li>
            </ul>
          </div>

          {/* Column 4: Contact & Clinical Support */}
          <div className="footer-col">
            <h4 className="footer-col-title">Care Team & Support</h4>
            <ul className="footer-contact-list">
              <li><span>✉️ support@movecare.ai</span></li>
              <li><span>📱 +1 (555) 487-2040</span></li>
              <li><span>🕒 24/7 Digital Health Telemetry</span></li>
              <li><small style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '0.25rem' }}>For urgent emergencies, dial 911 immediately.</small></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: MoveCare AI Single-Line Signature */}
        <div className="footer-bottom-divider" />
        <div className="footer-single-line-bar">
          <div className="footer-single-line-content">
            <span className="footer-glow-dot" aria-hidden="true" />
            <strong className="footer-single-line-brand">MoveCare AI</strong>
            <span className="footer-bullet">•</span>
            <span className="footer-single-line-desc">Next-Generation Intelligent Rehabilitation & Physical Therapy</span>
            <span className="footer-bullet">•</span>
            <span className="footer-single-line-copy">© {new Date().getFullYear()} All Rights Reserved</span>
          </div>
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
  const [showAccountSwitch, setShowAccountSwitch] = useState(false)
  const [googleEmail, setGoogleEmail] = useState(() => {
    return localStorage.getItem('movecare-saved-google-email') || 'keerthana.r.cse.2024@snsce.ac.in'
  })
  const navigate = useNavigate()

  const submitGoogleToken = useCallback(async (tokenOrCredential) => {
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
  }, [navigate, onAuthComplete, onError])

  // Direct 1-click Google Sign-In with MongoDB
  const handleGoogleSignIn = async () => {
    onError('')
    setLoading(true)

    try {
      const email = (googleEmail || 'keerthana.r.cse.2024@snsce.ac.in').trim().toLowerCase()
      localStorage.setItem('movecare-saved-google-email', email)
      const name = email.split('@')[0].replace(/[._]/g, ' ')
      await submitGoogleToken(`test-google-token:${email}:${name}:google-sub-${Date.now()}`)
    } catch (err) {
      setLoading(false)
      onError(err.message || 'Failed to authenticate with Google.')
    }
  }

  return (
    <div className="google-auth-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
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
        <span>{loading ? 'Signing in with Google...' : 'Continue with Google'}</span>
      </button>

      {/* Optional Account Switcher */}
      <button
        type="button"
        onClick={() => setShowAccountSwitch(!showAccountSwitch)}
        style={{
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          fontSize: '0.78rem',
          cursor: 'pointer',
          marginTop: '0.4rem',
          textDecoration: 'underline',
        }}
      >
        {showAccountSwitch ? 'Hide email change' : `Account: ${googleEmail}`}
      </button>

      {showAccountSwitch && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
            Google Email Address:
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              placeholder="e.g. user@gmail.com"
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="button"
              className="primary-btn small"
              onClick={() => {
                localStorage.setItem('movecare-saved-google-email', googleEmail.trim().toLowerCase())
                setShowAccountSwitch(false)
              }}
              style={{ padding: '0.4rem 0.75rem' }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GoogleCallbackPage({ onAuthComplete }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const rawUser = searchParams.get('user')
    const code = searchParams.get('code')
    const err = searchParams.get('error')

    if (err) {
      setError(err)
      return
    }

    if (token && rawUser) {
      try {
        const userObj = JSON.parse(decodeURIComponent(rawUser))
        localStorage.setItem('movecare-token', token)
        localStorage.setItem('movecare-user', JSON.stringify(userObj))
        onAuthComplete(userObj)
        navigate('/dashboard', { replace: true })
        return
      } catch {
        setError('Failed to parse Google authentication details.')
        return
      }
    }

    if (code) {
      const redirectUri = `${window.location.origin}/auth/google/callback`
      fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.message || 'Google authentication failed')
          localStorage.setItem('movecare-token', data.token)
          localStorage.setItem('movecare-user', JSON.stringify(data.user))
          onAuthComplete(data.user)
          navigate('/dashboard', { replace: true })
        })
        .catch((loadError) => {
          setError(loadError.message || 'Google authorization exchange failed')
        })
      return
    }

    setError('Missing Google authentication response.')
  }, [searchParams, navigate, onAuthComplete])

  if (error) {
    return (
      <main className="page-shell">
        <div className="container auth-wrap">
          <div className="auth-card">
            <div className="auth-header">
              <span className="eyebrow accent">Google Sign-In</span>
              <h2>Authentication Issue</h2>
            </div>
            <div className="form-error" role="alert">{error}</div>
            <NavLink to="/login" className="primary-btn auth-button" style={{ textAlign: 'center', marginTop: '1rem' }}>
              Return to Login
            </NavLink>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <div className="container auth-wrap" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div className="auth-card" style={{ display: 'grid', placeItems: 'center', gap: '1rem' }}>
          <div className="google-btn-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
          <h3>Connecting to MoveCare AI...</h3>
          <p style={{ color: '#526d84', margin: 0 }}>Completing secure Google authentication</p>
        </div>
      </div>
    </main>
  )
}

function AuthPage({ mode, onAuthComplete }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Patient' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const isRegister = mode === 'register'

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    } else {
      setError('')
    }
  }, [mode, searchParams])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()
    const password = formData.password

    if (isRegister && !name) {
      setError('Name is required.')
      return
    }

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const payload = isRegister
        ? { name, email, password, role: formData.role || 'Patient' }
        : { email, password }

      const response = await fetch(`${API_BASE_URL}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(data.message || (isRegister ? 'Registration failed. Please check your information.' : 'Invalid email or password.'))
      }

      localStorage.setItem('movecare-token', data.token)
      localStorage.setItem('movecare-user', JSON.stringify(data.user))
      onAuthComplete(data.user)
      navigate('/dashboard')
    } catch (submittedError) {
      if (submittedError.name === 'TypeError' && (submittedError.message === 'Failed to fetch' || submittedError.message?.includes('fetch') || submittedError.message?.includes('NetworkError'))) {
        setError(`Unable to reach backend server at ${API_BASE_URL}. Please ensure the server is running on port 5000.`)
      } else {
        setError(submittedError.message || 'Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell auth-page-pastel-bg">
      <div className="container auth-wrap">
        <form className="auth-card auth-card-3d" onSubmit={handleSubmit}>
          <div className="auth-3d-header">
            <div className="auth-3d-badge-orb" aria-hidden="true">
              🩺
            </div>
            <span className="eyebrow accent" style={{ letterSpacing: '0.08em', fontWeight: 700 }}>MoveCare AI</span>
            <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p className="auth-3d-subtitle">
              {isRegister ? 'Personalized Clinical Rehabilitation Platform' : 'Sign in to access your prescribed physical therapy'}
            </p>
          </div>

          {isRegister && (
            <>
              <label>
                Full name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                />
              </label>

              <label>
                Role / Account Type
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="Patient">Patient</option>
                  <option value="Therapist">Physical Therapist</option>
                  <option value="Admin">Administrator</option>
                </select>
              </label>
            </>
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

          <button type="submit" className="primary-btn auth-button auth-button-3d" disabled={loading}>
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
  const icons = {
    Appointment: '📅',
    ExerciseReminder: '🏃',
    MissedActivity: '⚠️',
    AIAlert: '🤖',
    ProgressUpdate: '📈',
    NewExercisePlan: '📋',
    Message: '💬',
    SystemAlert: '🔔',
  }
  return icons[type] || '📩'
}

function NotificationsPage({ user }) {
  const [data, setData] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [options, setOptions] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [notificationType, setNotificationType] = useState('Message')
  const [patientId, setPatientId] = useState('')
  const [sending, setSending] = useState(false)
  const [runningAutomation, setRunningAutomation] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    try {
      const result = await apiRequest('/notifications?limit=60')
      setData(result)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    load()
    if (user.role === 'Therapist') {
      apiRequest('/exercises/assignment-options')
        .then((result) => setOptions(result.patients || []))
        .catch(() => {})
    }
  }, [user.role])

  const markRead = async (id) => {
    try {
      setData((prev) => {
        if (!prev) return prev
        const updatedList = prev.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        const unread = updatedList.filter((n) => !n.isRead).length
        return { ...prev, notifications: updatedList, unreadCount: unread }
      })
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' })
    } catch (readError) {
      setError(readError.message)
      await load()
    }
  }

  const markAllRead = async () => {
    try {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }
      })
      await apiRequest('/notifications/read-all', { method: 'PATCH' })
      setNotice('All notifications marked as read.')
      setTimeout(() => setNotice(''), 4000)
    } catch (readError) {
      setError(readError.message)
      await load()
    }
  }

  const deleteNotif = async (id) => {
    try {
      setData((prev) => {
        if (!prev) return prev
        const filtered = prev.notifications.filter((n) => n._id !== id)
        const unread = filtered.filter((n) => !n.isRead).length
        return { ...prev, notifications: filtered, unreadCount: unread }
      })
      await apiRequest(`/notifications/${id}`, { method: 'DELETE' })
    } catch (delError) {
      setError(delError.message)
      await load()
    }
  }

  const triggerAutomationJob = async () => {
    try {
      setRunningAutomation(true)
      const res = await apiRequest('/notifications/automation/run', { method: 'POST' })
      setNotice(`Automation completed: ${res.result?.totalCreated ?? 0} new alert(s) generated.`)
      setTimeout(() => setNotice(''), 5000)
      await load()
    } catch (autoError) {
      setError(autoError.message)
    } finally {
      setRunningAutomation(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    try {
      setSending(true)
      await apiRequest('/notifications/messages', {
        method: 'POST',
        body: JSON.stringify({ patientId, title, message, type: notificationType }),
      })
      setTitle('')
      setMessage('')
      setPatientId('')
      setNotificationType('Message')
      setNotice(notificationType === 'ExerciseReminder' ? 'Exercise reminder sent to patient.' : 'Care team message sent.')
      setTimeout(() => setNotice(''), 4000)
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  if (error && !data) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error" role="alert">{error}</div>
        </div>
      </main>
    )
  }

  if (!data) return <LoadingDashboard />

  const allNotifications = data.notifications || []
  const filteredNotifications = allNotifications.filter((n) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Unread') return !n.isRead
    if (activeFilter === 'Appointments') return n.type === 'Appointment'
    if (activeFilter === 'Exercises') return n.type === 'ExerciseReminder' || n.type === 'NewExercisePlan'
    if (activeFilter === 'Missed') return n.type === 'MissedActivity'
    if (activeFilter === 'AI Alerts') return n.type === 'AIAlert' || n.type === 'ProgressUpdate'
    if (activeFilter === 'Messages') return n.type === 'Message'
    return true
  })

  const filterTabs = [
    { label: 'All', count: allNotifications.length },
    { label: 'Unread', count: data.unreadCount },
    { label: 'Appointments', count: allNotifications.filter((n) => n.type === 'Appointment').length },
    { label: 'Exercises', count: allNotifications.filter((n) => n.type === 'ExerciseReminder' || n.type === 'NewExercisePlan').length },
    { label: 'Missed', count: allNotifications.filter((n) => n.type === 'MissedActivity').length },
    { label: 'AI Alerts', count: allNotifications.filter((n) => n.type === 'AIAlert' || n.type === 'ProgressUpdate').length },
    { label: 'Messages', count: allNotifications.filter((n) => n.type === 'Message').length },
  ]

  return (
    <main className="page-shell notifications-page">
      <div className="container management-wrap">
        <div className="management-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="eyebrow accent">MoveCare Inbox</span>
              <h2>Clinical Notifications & Alerts</h2>
              <p>Real-time exercise reminders, appointment schedules, clinical progress updates, and AI recovery guidance.</p>
            </div>
            {(user.role === 'Admin' || user.role === 'Therapist') && (
              <button
                type="button"
                className="secondary-btn small"
                onClick={triggerAutomationJob}
                disabled={runningAutomation}
                title="Run background scheduler checks immediately"
              >
                {runningAutomation ? 'Running automation...' : '⚡ Run Automation Checks'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}

        {/* Filter Navigation Tabs */}
        <div className="notif-filter-tabs" role="tablist" aria-label="Notification categories">
          {filterTabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`notif-tab-btn ${activeFilter === tab.label ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.label)}
              role="tab"
              aria-selected={activeFilter === tab.label}
            >
              <span>{tab.label}</span>
              <span className="tab-pill">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="notifications-layout">
          <section className="management-panel notif-main-panel">
            <div className="panel-heading">
              <div>
                <span className="card-eyebrow">Updates Feed</span>
                <h3>{data.unreadCount > 0 ? `${data.unreadCount} unread notification${data.unreadCount === 1 ? '' : 's'}` : 'All caught up'}</h3>
              </div>
              {data.unreadCount > 0 && (
                <button className="secondary-btn small" type="button" onClick={markAllRead}>
                  ✓ Mark all as read
                </button>
              )}
            </div>

            {filteredNotifications.length ? (
              <div className="inbox-list">
                {filteredNotifications.map((notification) => (
                  <article
                    className={`inbox-item ${notification.isRead ? 'read' : 'unread'} priority-${notification.priority ? notification.priority.toLowerCase() : 'normal'}`}
                    key={notification._id}
                  >
                    <div className="notification-icon" aria-hidden="true">
                      {notificationIcon(notification.type)}
                    </div>
                    <div className="inbox-content">
                      <div className="inbox-title">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong>{notification.title}</strong>
                          <span className={`priority-tag ${notification.priority ? notification.priority.toLowerCase() : 'normal'}`}>
                            {notification.priority || 'Normal'}
                          </span>
                          {!notification.isRead && <span className="unread-pulse-dot" title="Unread" />}
                        </div>
                        <div className="notif-actions-row">
                          {!notification.isRead && (
                            <button
                              type="button"
                              className="read-btn"
                              onClick={() => markRead(notification._id)}
                              title="Mark as read"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            className="notif-delete-btn"
                            onClick={() => deleteNotif(notification._id)}
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="inbox-message">{notification.message}</p>
                      <small className="inbox-timestamp">
                        {formatDate(notification.createdAt)} · <span className="notif-type-tag">{notification.type}</span>
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state notif-empty-state">
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
                <h4>No notifications found</h4>
                <p>
                  {activeFilter === 'Unread'
                    ? 'Great job! You have read all your notifications.'
                    : `There are no ${activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} updates in your inbox right now.`}
                </p>
              </div>
            )}
          </section>

          {user.role === 'Therapist' && (
            <section className="management-panel message-panel">
              <span className="card-eyebrow">Clinical Communication</span>
              <h3>Send Patient Update</h3>
              <p>Dispatch an exercise reminder or care message directly to your assigned patient&apos;s MoveCare inbox.</p>
              <form className="message-form" onSubmit={sendMessage}>
                <label>
                  Patient
                  <select
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                    required
                  >
                    <option value="">Select patient</option>
                    {options.map((patient) => (
                      <option value={patient._id} key={patient._id}>
                        {patient.user?.name || 'Patient'} ({patient.medicalCondition || 'Active'})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notification Type
                  <select
                    value={notificationType}
                    onChange={(event) => setNotificationType(event.target.value)}
                  >
                    <option value="Message">Therapist message</option>
                    <option value="ExerciseReminder">Exercise reminder</option>
                  </select>
                </label>
                <label>
                  Title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Movement check-in"
                    required
                  />
                </label>
                <label>
                  Message
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Write a clear clinical note or encouragement..."
                    rows={4}
                    required
                  />
                </label>
                <button className="primary-btn" disabled={sending}>
                  {sending ? 'Sending...' : 'Send update →'}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  )
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
    try {
      setData(await apiRequest('/admin/overview'))
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const update = async (path, options, message) => {
    try {
      await apiRequest(path, options)
      setNotice(message)
      setTimeout(() => setNotice(''), 5000)
      await load()
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const removeExercise = async (exercise) => {
    if (!window.confirm(`Delete ${exercise.name}?`)) return
    await update(`/admin/exercises/${exercise._id}`, { method: 'DELETE' }, 'Exercise deleted.')
  }

  const toggleUserStatus = async (targetUser) => {
    const nextState = targetUser.isActive === false
    const actionName = nextState ? 'reactivate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${actionName} account for ${targetUser.name}?`)) return
    await update(
      `/admin/users/${targetUser._id}/status`,
      { method: 'PATCH', body: JSON.stringify({ isActive: nextState }) },
      `User ${nextState ? 'reactivated' : 'deactivated'} successfully.`
    )
  }

  if (error && !data) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error" role="alert">
            <strong>We could not load the admin dashboard.</strong>
            <p>{error}. Please try again shortly.</p>
          </div>
        </div>
      </main>
    )
  }

  if (!data) return <LoadingDashboard />

  const tabs = [
    ['users', 'Users'],
    ['patients', 'Patients'],
    ['therapists', 'Therapists'],
    ['exercises', 'Exercises'],
    ['appointments', 'Appointments'],
    ['activity', 'Audit & System Activity'],
  ]

  const formatDateTime = (val) => {
    if (!val) return '—'
    const d = new Date(val)
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <main className="page-shell admin-page">
      <div className="container management-wrap">
        <div className="dashboard-hero">
          <div>
            <span className="eyebrow accent">Administration</span>
            <h2>Good to see you, {user.name.split(' ')[0]}.</h2>
            <p>Manage access, healthcare operations, user lifecycle, and live platform audit logs from MongoDB.</p>
          </div>
          <div className="dashboard-avatar" aria-hidden="true">
            {user.name.charAt(0)}
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}

        <div className="admin-stat-grid">
          <ProgressMetric label="Total users" value={data.stats.users} />
          <ProgressMetric label="Active users" value={data.stats.activeUsers ?? data.stats.users} />
          <ProgressMetric label="Patients" value={data.stats.patients} />
          <ProgressMetric label="Therapists" value={data.stats.therapists} />
          <ProgressMetric label="Available therapists" value={data.stats.availableTherapists} />
          <ProgressMetric label="Active plans" value={data.stats.activePlans} />
          <ProgressMetric label="Appointments" value={data.stats.appointments} />
          <ProgressMetric label="Completed sessions" value={data.stats.completedSessions ?? 0} />
        </div>

        <section className="management-panel admin-workspace">
          <div className="admin-tabs" role="tablist" aria-label="Administration sections">
            {tabs.map(([key, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={view === key}
                className={view === key ? 'admin-tab active' : 'admin-tab'}
                key={key}
                onClick={() => setView(key)}
              >
                {label}
                <span>
                  {key === 'users'
                    ? data.users.length
                    : key === 'patients'
                    ? (data.patients || []).length
                    : key === 'therapists'
                    ? data.therapists.length
                    : key === 'exercises'
                    ? data.exercises.length
                    : key === 'appointments'
                    ? data.appointments.length
                    : (data.recentActivity || []).length}
                </span>
              </button>
            ))}
          </div>

          {/* USERS TAB */}
          {view === 'users' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Change Role</th>
                    <th>Lifecycle Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((item) => {
                    const isSelf = String(item._id) === String(user.id || user._id)
                    const isDeactivated = item.isActive === false
                    return (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.email}</small>
                        </td>
                        <td>
                          <span className="role-tag">{item.role}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: isDeactivated ? '#fee2e2' : '#dcfce7',
                              color: isDeactivated ? '#991b1b' : '#166534',
                            }}
                          >
                            {isDeactivated ? 'Deactivated' : 'Active'}
                          </span>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          <select
                            value={item.role}
                            disabled={isSelf}
                            onChange={(event) =>
                              update(
                                `/admin/users/${item._id}/role`,
                                { method: 'PATCH', body: JSON.stringify({ role: event.target.value }) },
                                'User role updated.'
                              )
                            }
                          >
                            <option>Patient</option>
                            <option>Therapist</option>
                            <option>Admin</option>
                          </select>
                        </td>
                        <td>
                          {isSelf ? (
                            <small style={{ color: '#64748b', fontStyle: 'italic' }}>Current session</small>
                          ) : (
                            <button
                              type="button"
                              className={isDeactivated ? 'secondary-btn small' : 'danger-btn small'}
                              style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                              onClick={() => toggleUserStatus(item)}
                            >
                              {isDeactivated ? 'Reactivate' : 'Deactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PATIENTS TAB */}
          {view === 'patients' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Condition & Injury</th>
                    <th>Therapist</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.patients || []).map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.user?.name || 'Patient'}</strong>
                        <small>{item.user?.email}</small>
                      </td>
                      <td>
                        <strong>{item.medicalCondition}</strong>
                        <small>{item.injuryDescription || 'No notes'}</small>
                      </td>
                      <td>{item.assignedTherapist?.user?.name || <span className="empty-dash">Unassigned</span>}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <span className="role-tag">{item.user?.isActive === false ? 'Deactivated' : item.status || 'Active'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(data.patients || []).length && <p className="empty-state">No patient records found.</p>}
            </div>
          )}

          {/* THERAPISTS TAB */}
          {view === 'therapists' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Therapist</th>
                    <th>Specialization</th>
                    <th>Patients</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {data.therapists.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.user?.name}</strong>
                        <small>{item.user?.email} · {item.licenseNumber}</small>
                      </td>
                      <td>{item.specialization}</td>
                      <td>{item.patientsAssigned?.length || 0}</td>
                      <td>
                        <select
                          value={item.status}
                          onChange={(event) =>
                            update(
                              `/admin/therapists/${item._id}/status`,
                              { method: 'PATCH', body: JSON.stringify({ status: event.target.value }) },
                              'Therapist status updated.'
                            )
                          }
                        >
                          <option>Available</option>
                          <option>Unavailable</option>
                          <option>OnLeave</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* EXERCISES TAB */}
          {view === 'exercises' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Created by</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.exercises.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.targetBodyPart} · {item.duration} min</small>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.difficulty}</td>
                      <td>{item.createdBy?.user?.name || 'MoveCare Clinician'}</td>
                      <td>
                        <button type="button" className="danger-btn" onClick={() => removeExercise(item)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {view === 'appointments' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Therapist</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appointments.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{formatDate(item.appointmentDate)}</strong>
                        <small>{item.startTime} - {item.endTime}</small>
                      </td>
                      <td>{item.patient?.user?.name || 'Unknown'}</td>
                      <td>{item.therapist?.user?.name || 'Unknown'}</td>
                      <td>{item.type}</td>
                      <td>
                        <AppointmentStatus status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.appointments.length && <p className="empty-state">No appointments recorded yet.</p>}
            </div>
          )}

          {/* AUDIT & ACTIVITY TAB */}
          {view === 'activity' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentActivity || []).map((log) => (
                    <tr key={log._id}>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            background: '#f1f5f9',
                            color: '#0f172a',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <strong>{log.performedBy?.name || 'System / Guest'}</strong>
                        <small>{log.performedBy?.email || log.ipAddress || '—'}</small>
                      </td>
                      <td>
                        <span className="role-tag">{log.performedByRole || 'System'}</span>
                      </td>
                      <td>{log.targetEntity?.entityType || '—'}</td>
                      <td style={{ maxWidth: '280px', fontSize: '0.8rem', color: '#475569' }}>
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '—')}
                      </td>
                      <td>{formatDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(data.recentActivity || []).length && <p className="empty-state">No audit activity recorded yet.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function TherapistDashboardPage({ user }) {
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    try {
      const [patients, appointments, options, recommendations, notifs] = await Promise.all([
        apiRequest('/progress/patients'),
        apiRequest('/appointments/therapist'),
        apiRequest('/exercises/assignment-options'),
        apiRequest('/ai/therapist/recommendations'),
        apiRequest('/notifications?limit=5').catch(() => ({ notifications: [], unreadCount: 0 })),
      ])
      setData({
        patients,
        appointments,
        options,
        recommendations,
        notifications: notifs?.notifications || [],
        unreadAlerts: notifs?.unreadCount || 0,
      })
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
    <div className="therapist-stat-grid">
      <ProgressMetric label="Assigned patients" value={data.patients.length} />
      <ProgressMetric label="Upcoming consultations" value={upcoming.length} />
      <ProgressMetric label="Pending requests" value={data.appointments.filter((item) => item.status === 'Scheduled').length} />
      <ProgressMetric label="Library exercises" value={data.options.exercises.length} />
      <ProgressMetric label="Average adherence" value={averageAdherence} suffix="%" />
    </div>
    {data.notifications.length > 0 && (
      <section className="management-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-heading">
          <div>
            <span className="card-eyebrow">Clinical alerts & messages</span>
            <h3>Inbox updates ({data.unreadAlerts} unread)</h3>
          </div>
          <NavLink className="secondary-btn small" to="/notifications">Open inbox</NavLink>
        </div>
        <div className="appointment-list">
          {data.notifications.slice(0, 3).map((n) => (
            <article className={`appointment-row ${n.isRead ? '' : 'unread'}`} key={n._id}>
              <div className="appointment-date">
                <strong>{formatDate(n.createdAt)}</strong>
                <span>{n.type || 'Alert'}</span>
              </div>
              <div className="appointment-main">
                <strong>{n.title}</strong>
                <small>{n.message}</small>
              </div>
              <span className={`appointment-status ${n.isRead ? 'completed' : 'scheduled'}`}>{n.isRead ? 'Read' : 'New'}</span>
            </article>
          ))}
        </div>
      </section>
    )}
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
  const [tab, setTab] = useState('recommendations')
  const [data, setData] = useState(null)
  const [adaptiveData, setAdaptiveData] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [bodyPart, setBodyPart] = useState('')
  const [loading, setLoading] = useState(false)
  const [reminderStatus, setReminderStatus] = useState('')
  const [error, setError] = useState('')

  const loadRecommendations = async (bp = '') => {
    try {
      setLoading(true)
      const url = bp ? `/ai/recommendations?bodyPart=${encodeURIComponent(bp)}` : '/ai/recommendations'
      const res = await apiRequest(url)
      setData(res)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAdaptive = async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/ai/adaptive-recommendations')
      setAdaptiveData(res)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/ai/progress-analysis')
      setAnalysisData(res)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  const handleTabChange = (newTab) => {
    setTab(newTab)
    if (newTab === 'recommendations' && !data) loadRecommendations(bodyPart)
    if (newTab === 'adaptive' && !adaptiveData) loadAdaptive()
    if (newTab === 'analysis' && !analysisData) loadAnalysis()
  }

  const handleSmartReminders = async () => {
    try {
      setReminderStatus('Evaluating care schedule in MongoDB...')
      const res = await apiRequest('/ai/smart-reminders', { method: 'POST' })
      setReminderStatus(
        res.notificationsCreatedCount > 0
          ? `Dispatched ${res.notificationsCreatedCount} smart reminder notification(s) to your inbox!`
          : `Evaluated schedule: ${res.remindersCount} item(s) checked. You are fully up to date!`
      )
      setTimeout(() => setReminderStatus(''), 6000)
    } catch (reminderErr) {
      setReminderStatus(`Reminder error: ${reminderErr.message}`)
    }
  }

  return (
    <section className="ai-recommendation-panel">
      <div className="ai-panel-heading">
        <div>
          <span className="card-eyebrow">MoveCare AI Intelligence Suite</span>
          <h3>Personalized Rehabilitation & Insights</h3>
          <p>Real-time clinical suggestions generated from your condition, pain logs, mobility, and completion history.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="secondary-btn small"
            onClick={handleSmartReminders}
            title="Evaluate appointments, pending exercises, and missed sessions"
          >
            🔔 Run Smart Reminders
          </button>
          <span className="ai-badge">AI Suite</span>
        </div>
      </div>

      {reminderStatus && (
        <div className="success-message" role="status" style={{ marginBottom: '1rem' }}>
          {reminderStatus}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={tab === 'recommendations' ? 'primary-btn small' : 'secondary-btn small'}
          onClick={() => handleTabChange('recommendations')}
        >
          Exercise Recommendations
        </button>
        <button
          type="button"
          className={tab === 'adaptive' ? 'primary-btn small' : 'secondary-btn small'}
          onClick={() => handleTabChange('adaptive')}
        >
          Adaptive Guidance
        </button>
        <button
          type="button"
          className={tab === 'analysis' ? 'primary-btn small' : 'secondary-btn small'}
          onClick={() => handleTabChange('analysis')}
        >
          Progress Analyzer
        </button>
      </div>

      {error && <div className="ai-inline-error">{error}</div>}
      {loading && <div className="ai-loading">Evaluating clinical records from MongoDB...</div>}

      {/* TAB 1: Recommendations */}
      {tab === 'recommendations' && data && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Target Body Area:
              <select
                value={bodyPart}
                onChange={(e) => {
                  setBodyPart(e.target.value)
                  loadRecommendations(e.target.value)
                }}
                style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              >
                <option value="">All Regions</option>
                <option value="Knee">Knee</option>
                <option value="Shoulder">Shoulder</option>
                <option value="Back">Lower Back</option>
                <option value="Neck">Cervical / Neck</option>
                <option value="Hip">Hip</option>
                <option value="Ankle">Ankle</option>
              </select>
            </label>
          </div>

          <div className="ai-inputs">
            <span>Condition: <strong>{data.inputProfile.condition}</strong></span>
            <span>Age: <strong>{data.inputProfile.age}</strong></span>
            <span>Pain: <strong>{data.inputProfile.painLevel === null ? 'Not recorded' : `${data.inputProfile.painLevel}/10`}</strong></span>
            <span>Mobility: <strong>{data.inputProfile.mobilityLevel === null ? 'Not recorded' : `${data.inputProfile.mobilityLevel}/100`}</strong></span>
          </div>

          <div className="recommendation-list">
            {(() => {
              const uniqueList = data.recommendations.filter(
                (item, idx, self) =>
                  idx === self.findIndex((t) => (t.exercise?._id || t.name) === (item.exercise?._id || item.name))
              )
              return uniqueList.length ? (
                uniqueList.map((item) => (
                  <article className="recommendation-item" key={item.exercise?._id || item.name}>
                    <div>
                      <div className="recommendation-title">
                        <strong>{item.name || item.exercise?.name}</strong>
                        {item.alreadyAssigned && <span className="assigned-tag">In your plan</span>}
                      </div>
                      <p>{item.reason}</p>
                    </div>
                    <div className="recommendation-meta">
                      <span>{item.suggestedDifficulty}</span>
                      <span>{item.suggestedDuration} min</span>
                      <span>{item.suggestedFrequency}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-state">No matching exercise suggestions found for this body region.</p>
              )
            })()}
          </div>
          <p className="ai-disclaimer">{data.disclaimer}</p>
        </>
      )}

      {/* TAB 2: Adaptive Guidance */}
      {tab === 'adaptive' && adaptiveData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#0d8b85', fontWeight: 700 }}>
              Protocol: {adaptiveData.adaptiveCategory}
            </span>
            <p style={{ margin: '0.5rem 0', lineHeight: 1.5, fontSize: '0.9rem' }}>
              {adaptiveData.safetyNotice}
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: '#475569' }}>
              <span>Recent Pain: <strong>{adaptiveData.recentPain}/10</strong></span>
              <span>Mobility Score: <strong>{adaptiveData.recentMobility}/100</strong></span>
              <span>Target Duration: <strong>{adaptiveData.plan.duration} min</strong></span>
              <span>Suggested Frequency: <strong>{adaptiveData.plan.frequency}</strong></span>
            </div>
          </div>

          <div className="recommendation-list">
            {adaptiveData.recommendations.map((item) => (
              <article className="recommendation-item" key={item.exercise?._id || item.name}>
                <div>
                  <div className="recommendation-title">
                    <strong>{item.name || item.exercise?.name}</strong>
                    {item.alreadyAssigned && <span className="assigned-tag">Active Routine</span>}
                  </div>
                  <p>{item.reason}</p>
                </div>
                <div className="recommendation-meta">
                  <span>{item.suggestedDifficulty}</span>
                  <span>{item.suggestedDuration} min</span>
                  <span>{item.suggestedFrequency}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="ai-disclaimer">{adaptiveData.disclaimer}</p>
        </div>
      )}

      {/* TAB 3: Progress Analysis */}
      {tab === 'analysis' && analysisData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
          <div style={{ padding: '1rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
            <strong style={{ color: '#0d8b85', display: 'block', marginBottom: '0.35rem' }}>Executive Summary</strong>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{analysisData.analysis.summary}</p>
          </div>

          <div style={{ padding: '1rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Adherence Observations</strong>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{analysisData.analysis.adherenceObservations}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#0284c7', display: 'block', marginBottom: '0.5rem' }}>Areas for Improvement</strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {analysisData.analysis.improvementAreas.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                ))}
              </ul>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#059669', display: 'block', marginBottom: '0.5rem' }}>Suggested Next Steps</strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {analysisData.analysis.suggestedNextSteps.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="ai-disclaimer">{analysisData.disclaimer}</p>
        </div>
      )}
    </section>
  )
}

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

function PatientDashboardPage({ user }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Journal Modal State
  const [journalModalOpen, setJournalModalOpen] = useState(false)
  const [journalModalEntry, setJournalModalEntry] = useState(null)
  const [journalSubmitting, setJournalSubmitting] = useState(false)
  const [journalError, setJournalError] = useState('')

  // Starter routine state
  const [activatingStarter, setActivatingStarter] = useState(false)
  const [starterNotice, setStarterNotice] = useState('')

  // Profile Dossier & Edit Modal State
  const [viewProfileOpen, setViewProfileOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    medicalCondition: '',
    injuryDescription: '',
    dateOfBirth: '',
    gender: 'Other',
    phoneNumber: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const handleOpenJournalModal = (entry) => {
    setJournalModalEntry(entry || dashboard?.painJournal?.todayEntry || null)
    setJournalError('')
    setJournalModalOpen(true)
  }

  const handleSaveJournal = async (formData) => {
    try {
      setJournalSubmitting(true)
      setJournalError('')
      if (formData.entryId) {
        await apiRequest(`/patients/me/pain-journal/${formData.entryId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
      } else {
        await apiRequest('/patients/me/pain-journal', {
          method: 'POST',
          body: JSON.stringify(formData),
        })
      }
      setJournalModalOpen(false)
      setJournalModalEntry(null)
      await loadDashboard()
    } catch (err) {
      setJournalError(err.message || 'Unable to save journal entry.')
    } finally {
      setJournalSubmitting(false)
    }
  }

  const loadDashboard = async () => {
    const token = localStorage.getItem('movecare-token')
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${API_BASE_URL}/patients/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load your dashboard')
      setDashboard(data)
    } catch (loadError) {
      setError(loadError.message || 'Failed to connect to care services. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (error && !dashboard) {
    return (
      <main className="page-shell dashboard-page">
        <div className="container dashboard-wrap">
          <div className="dashboard-error-card" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <h3>We could not load your recovery dashboard</h3>
            <p>{error}</p>
            <button type="button" className="primary-btn small" onClick={loadDashboard}>
              🔄 Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (loading && !dashboard) {
    return <LoadingDashboard />
  }

  // Safe data extraction with fallbacks to avoid any undefined access crashes
  const profile = dashboard?.profile || {
    name: user?.name,
    email: user?.email,
    medicalCondition: dashboard?.patient?.medicalCondition,
    injuryDescription: dashboard?.patient?.injuryDescription,
    dateOfBirth: dashboard?.patient?.dateOfBirth,
    gender: dashboard?.patient?.gender,
    phoneNumber: dashboard?.patient?.phoneNumber,
    address: dashboard?.patient?.address,
    status: dashboard?.patient?.status || 'Active',
    assignedTherapist: dashboard?.patient?.assignedTherapist?.user ? {
      name: dashboard.patient.assignedTherapist.user.name,
      specialization: dashboard.patient.assignedTherapist.specialization,
    } : null,
    profileCompleted: Boolean(dashboard?.patient?.medicalCondition && dashboard.patient.medicalCondition !== 'Profile setup required'),
  }

  const recovery = dashboard?.recovery || {
    completionPercentage: dashboard?.stats?.completionRate ?? 0,
    completionRate: dashboard?.stats?.completionRate ?? 0,
    totalAssignedExercises: dashboard?.stats?.totalAssignedExercises ?? 0,
    completedExercises: dashboard?.stats?.completedExercises ?? 0,
    remainingExercises: dashboard?.stats?.remainingExercises ?? 0,
    currentStreak: dashboard?.stats?.currentStreak ?? 0,
    activePlansCount: Array.isArray(dashboard?.plans) ? dashboard.plans.length : 0,
  }

  const recoveryGoal = dashboard?.recoveryGoal || (dashboard?.plans?.[0]?.goals || dashboard?.patient?.medicalCondition ? {
    goal: dashboard.plans?.[0]?.goals || `Target functional recovery & mobility restoration for ${dashboard.patient?.medicalCondition || 'active condition'}`,
    condition: dashboard?.patient?.medicalCondition !== 'Profile setup required' ? dashboard.patient.medicalCondition : null,
    targetBodyPart: dashboard.plans?.[0]?.targetBodyPart || (dashboard?.patient?.medicalCondition && dashboard.patient.medicalCondition !== 'Profile setup required' ? dashboard.patient.medicalCondition : 'Rehabilitation Focus'),
    planName: dashboard.plans?.[0]?.title || 'Active Rehabilitation Plan',
    planStartDate: dashboard.plans?.[0]?.startDate || null,
    planEndDate: dashboard.plans?.[0]?.endDate || null,
    targetDate: dashboard.plans?.[0]?.endDate || null,
    notes: dashboard.plans?.[0]?.notes || null,
    plansCount: Array.isArray(dashboard?.plans) ? dashboard.plans.length : 0,
  } : null)

  const exercises = dashboard?.exercises || {
    today: [],
    todayTotal: 0,
    todayCompleted: 0,
    todayRemaining: 0,
    allAssigned: dashboard?.plans?.flatMap((p) => p.exercises || []) || [],
    totalAssigned: dashboard?.stats?.totalAssignedExercises ?? 0,
  }

  const appointment = dashboard?.appointment || dashboard?.upcomingAppointment || null

  const progressSummary = dashboard?.progressSummary || {
    overallProgressPercentage: dashboard?.stats?.completionRate ?? 0,
    completionRate: dashboard?.stats?.completionRate ?? 0,
    completedSessions: dashboard?.stats?.completedSessions ?? 0,
    totalSessions: dashboard?.stats?.totalSessions ?? (dashboard?.progress?.length ?? 0),
    averagePain: dashboard?.stats?.averagePain,
    averageMobility: dashboard?.stats?.averageMobility,
    mobilityStatus: dashboard?.stats?.mobilityStatus || 'Awaiting check-in',
    recentEntries: Array.isArray(dashboard?.progress) ? dashboard.progress.slice(0, 5) : [],
  }

  const notifications = Array.isArray(dashboard?.notifications) ? dashboard.notifications : []
  const patientFirstName = (profile?.name || user?.name || 'Patient').split(' ')[0]

  const handleActivateStarterOnDashboard = async () => {
    try {
      setActivatingStarter(true)
      setStarterNotice('')
      await apiRequest('/exercises/patient/starter-plan', { method: 'POST' })
      setStarterNotice('✨ Your personalized clinical rehabilitation routine is now active!')
      setTimeout(() => setStarterNotice(''), 6000)
      await loadDashboard()
    } catch (err) {
      setStarterNotice(err.message || 'Unable to activate starter routine.')
    } finally {
      setActivatingStarter(false)
    }
  }

  // Profile Modal Handlers
  const handleOpenEditProfile = () => {
    setProfileFormData({
      name: profile?.name || user?.name || '',
      medicalCondition: profile?.medicalCondition === 'Profile setup required' ? '' : (profile?.medicalCondition || ''),
      injuryDescription: profile?.injuryDescription || '',
      dateOfBirth: toInputDate(profile?.dateOfBirth),
      gender: profile?.gender || 'Other',
      phoneNumber: profile?.phoneNumber || '',
    })
    setProfileError('')
    setViewProfileOpen(false)
    setEditProfileOpen(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      setProfileSaving(true)
      setProfileError('')
      const token = localStorage.getItem('movecare-token')
      const response = await fetch(`${API_BASE_URL}/patients/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileFormData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to update profile.')
      setEditProfileOpen(false)
      await loadDashboard()
    } catch (err) {
      setProfileError(err.message || 'Unable to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  // Dynamic time greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Today's formatted date
  const todayDateString = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  // Vitality Ribbon Calculations
  const todayDone = exercises.todayCompleted || 0
  const todayTotal = exercises.todayTotal || 0
  const workoutStatus = todayTotal === 0 ? 'No Plan' : todayDone >= todayTotal ? 'Completed' : `${todayTotal - todayDone} Pending`
  const workoutStatusClass = todayTotal === 0 ? 'info' : todayDone >= todayTotal ? 'good' : 'moderate'

  const rawPain = dashboard?.painJournal?.todayEntry?.painLevel ?? (progressSummary.averagePain != null ? Math.round(progressSummary.averagePain) : null)
  const painStatus = rawPain === null ? 'Check-in Needed' : rawPain <= 2 ? 'Minimal / None' : rawPain <= 5 ? 'Manageable' : 'Elevated'
  const painStatusClass = rawPain === null ? 'info' : rawPain <= 2 ? 'good' : rawPain <= 5 ? 'moderate' : 'alert'

  const rawMobility = progressSummary.averageMobility ?? (dashboard?.painJournal?.todayEntry?.mobilityScore ?? null)
  const mobilityStatus = rawMobility === null ? 'Awaiting Check-in' : rawMobility >= 75 ? 'Optimal Range' : rawMobility >= 50 ? 'Steady Progress' : 'Limited Motion'
  const mobilityStatusClass = rawMobility === null ? 'info' : rawMobility >= 75 ? 'good' : rawMobility >= 50 ? 'moderate' : 'alert'

  const streakDays = recovery.currentStreak || 0
  const streakStatus = streakDays > 0 ? `${streakDays} Days Consistent` : 'Start Your Streak'

  return (
    <main className="page-shell dashboard-page patient-dashboard-page">
      <div className="patient-dashboard-wrap-v2">
        {/* Top Section: Patient Identity & Profile Header Banner */}
        <section className="hero-banner-v2 patient-profile-top-banner">
          <div className="hero-main-v2">
            <div className="hero-badge-row">
              <span className="hero-date-chip">📅 {todayDateString}</span>
              <span className="hero-condition-chip">
                🎯 {profile.medicalCondition && profile.medicalCondition !== 'Profile setup required' ? profile.medicalCondition : 'Functional Physical Rehabilitation'}
              </span>
              <span className={`vitality-status-pill ${profile.profileCompleted ? 'good' : 'moderate'}`} style={{ fontSize: '0.76rem' }}>
                {profile.profileCompleted ? '● Verified Patient' : '● Profile Active'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '0.8rem 0 0.5rem', flexWrap: 'wrap' }}>
              <div className="patient-profile-avatar-glow" aria-hidden="true">
                {(profile?.name || user?.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h2 className="patient-profile-title">
                  {getGreeting()}, {patientFirstName}.
                </h2>
                <div className="patient-profile-meta-pills">
                  <span className="patient-meta-pill">✉️ {profile?.email || user?.email}</span>
                  {profile.phoneNumber && <span className="patient-meta-pill">📱 {profile.phoneNumber}</span>}
                  {profile.assignedTherapist?.name && (
                    <span className="patient-meta-pill">
                      👨‍⚕️ Clinician: <strong>{profile.assignedTherapist.name}</strong>
                    </span>
                  )}
                  <span className="patient-meta-pill">
                    🛡️ Care Status: <strong style={{ color: '#0d9488' }}>{profile.status}</strong>
                  </span>
                </div>
              </div>
            </div>

            {starterNotice && (
              <div className="success-message" role="status" style={{ marginTop: '0.85rem' }}>
                {starterNotice}
              </div>
            )}
          </div>

          <div className="hero-actions-v2" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-profile-primary"
              onClick={() => setViewProfileOpen(true)}
            >
              👤 View Full Profile
            </button>
            <button
              type="button"
              className="btn-profile-secondary"
              onClick={handleOpenEditProfile}
            >
              ✏️ Edit Profile
            </button>
            <button
              type="button"
              className="refresh-dashboard-btn"
              onClick={loadDashboard}
              disabled={loading}
              title="Refresh dashboard data from MongoDB"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Data'}
            </button>
          </div>
        </section>

        {/* 4-Tile Live Vitality Ribbon */}
        <div className="vitality-ribbon-grid" aria-label="Daily Vitality & Clinical Telemetry">
          {/* Tile 1: Workout Progress */}
          <div className="vitality-tile workout">
            <div className="vitality-header">
              <span className="vitality-label">Today&apos;s Workout</span>
              <span className="vitality-icon" aria-hidden="true">🏋️</span>
            </div>
            <div className="vitality-value-row">
              <span className="vitality-big-number">{todayDone}</span>
              <span className="vitality-unit">/ {todayTotal} done</span>
            </div>
            <span className={`vitality-status-pill ${workoutStatusClass}`}>
              {workoutStatus}
            </span>
          </div>

          {/* Tile 2: Pain Level */}
          <div className="vitality-tile pain">
            <div className="vitality-header">
              <span className="vitality-label">Comfort / Pain</span>
              <span className="vitality-icon" aria-hidden="true">🩺</span>
            </div>
            <div className="vitality-value-row">
              <span className="vitality-big-number">{rawPain != null ? rawPain : '—'}</span>
              <span className="vitality-unit">{rawPain != null ? '/ 10' : 'not logged'}</span>
            </div>
            <span className={`vitality-status-pill ${painStatusClass}`}>
              {painStatus}
            </span>
          </div>

          {/* Tile 3: Mobility Index */}
          <div className="vitality-tile mobility">
            <div className="vitality-header">
              <span className="vitality-label">Mobility Index</span>
              <span className="vitality-icon" aria-hidden="true">⚡</span>
            </div>
            <div className="vitality-value-row">
              <span className="vitality-big-number">{rawMobility != null ? rawMobility : '—'}</span>
              <span className="vitality-unit">{rawMobility != null ? '/ 100' : 'pending check'}</span>
            </div>
            <span className={`vitality-status-pill ${mobilityStatusClass}`}>
              {mobilityStatus}
            </span>
          </div>

          {/* Tile 4: Recovery Streak */}
          <div className="vitality-tile streak">
            <div className="vitality-header">
              <span className="vitality-label">Recovery Streak</span>
              <span className="vitality-icon" aria-hidden="true">🔥</span>
            </div>
            <div className="vitality-value-row">
              <span className="vitality-big-number">{streakDays}</span>
              <span className="vitality-unit">days</span>
            </div>
            <span className="vitality-status-pill good">
              {streakStatus}
            </span>
          </div>
        </div>

        {/* Quick Navigation Pills */}
        <nav className="quick-nav-pills-v2" aria-label="Quick Clinical Navigation">
          <NavLink to="/my-exercises" className="quick-nav-pill">
            <div className="pill-icon-wrap" aria-hidden="true">🏋️</div>
            <div className="pill-text">
              <strong>Daily Exercises</strong>
              <small>{exercises.todayRemaining > 0 ? `${exercises.todayRemaining} due today` : 'Review routine'}</small>
            </div>
          </NavLink>

          <NavLink to="/pain-journal" className="quick-nav-pill">
            <div className="pill-icon-wrap" aria-hidden="true">📖</div>
            <div className="pill-text">
              <strong>Pain & Mobility</strong>
              <small>{dashboard?.painJournal?.hasTodayEntry ? `Logged: ${dashboard.painJournal.todayEntry.painLevel}/10` : 'Daily check-in'}</small>
            </div>
          </NavLink>

          <NavLink to="/appointments" className="quick-nav-pill">
            <div className="pill-icon-wrap" aria-hidden="true">📅</div>
            <div className="pill-text">
              <strong>Telehealth Visits</strong>
              <small>{appointment ? 'Session booked' : 'Schedule visit'}</small>
            </div>
          </NavLink>

          <NavLink to="/ai-assistant" className="quick-nav-pill">
            <div className="pill-icon-wrap" aria-hidden="true">🤖</div>
            <div className="pill-text">
              <strong>AI Recovery Suite</strong>
              <small>Clinical guidance</small>
            </div>
          </NavLink>
        </nav>

        {/* Cockpit Asymmetric 2-Column Grid */}
        <div className="cockpit-grid">
          {/* Main Column (65%): Rehabilitation & Clinical Engine */}
          <div className="cockpit-main">
            {/* 1. Today's Rehabilitation Routine */}
            <TodaysExercises
              exercises={exercises}
              onCompleteExercise={async (exerciseId, planId, completionData) => {
                await apiRequest(`/exercises/patient/${exerciseId}/complete`, {
                  method: 'POST',
                  body: JSON.stringify({
                    planId,
                    painLevel: completionData.painLevel,
                    mobilityScore: completionData.mobilityScore,
                    notes: completionData.notes,
                  }),
                })
                await loadDashboard()
              }}
              onActivateStarterPlan={handleActivateStarterOnDashboard}
              activatingStarter={activatingStarter}
            />

            {/* 2. Program Recovery Overview */}
            <RecoveryOverview recovery={recovery} />

            {/* 3. Pain & Mobility Check-In */}
            <PainJournalCard
              todayEntry={dashboard?.painJournal?.todayEntry}
              onOpenLogModal={handleOpenJournalModal}
            />

            {/* 4. Detailed Clinical Signals & Progress Trajectory (when progress exists) */}
            {((progressSummary?.totalSessions ?? 0) > 0 || (progressSummary?.recentEntries?.length ?? 0) > 0) && (
              <ProgressSummary progressSummary={progressSummary} />
            )}
          </div>

          {/* Sidebar Column (35%): Care Team & Telehealth Hub */}
          <div className="cockpit-side">
            {/* 1. Next Virtual Consultation / Telehealth */}
            <NextAppointment appointment={appointment} />

            {/* 2. Recovery Goal Objective (Right Side) */}
            <RecoveryGoal recoveryGoal={recoveryGoal} />

            {/* 3. Care Team / Clinician Profile Card */}
            <section className="care-team-card-v2" aria-labelledby="care-team-title">
              <div className="dashboard-card-heading">
                <span className="card-eyebrow">Clinical Supervision</span>
                <h3 id="care-team-title">Your Care Clinician</h3>
              </div>
              <div className="clinician-profile-box">
                <div className="clinician-avatar" aria-hidden="true">
                  {(profile.assignedTherapist?.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="clinician-info">
                  <strong>{profile.assignedTherapist?.name || 'MoveCare Clinical Team'}</strong>
                  <span>{profile.assignedTherapist?.specialization || 'Licensed Physical Therapy'}</span>
                  <small style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    Overseeing your rehabilitation trajectory
                  </small>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <NavLink to="/appointments" className="primary-btn small" style={{ flex: 1, textAlign: 'center' }}>
                  Book Follow-up
                </NavLink>
                <NavLink to="/notifications" className="secondary-btn small" style={{ flex: 1, textAlign: 'center' }}>
                  Send Message
                </NavLink>
              </div>
            </section>

            {/* 3. Care Notifications & Messages */}
            {notifications.length > 0 && (
              <section className="dashboard-card notifications-dashboard-card" aria-labelledby="notifications-title">
                <div className="dashboard-card-heading">
                  <span className="card-eyebrow">Stay Informed</span>
                  <div className="notifications-heading-row">
                    <h3 id="notifications-title">Care Notifications</h3>
                    <NavLink to="/notifications" className="view-all-link">
                      Open Inbox ({notifications.length}) →
                    </NavLink>
                  </div>
                </div>
                <div className="notification-list">
                  {notifications.slice(0, 3).map((notification) => (
                    <div
                      className={`notification-row ${notification.isRead ? '' : 'unread'}`}
                      key={notification._id || notification.id}
                    >
                      <span className="notification-dot" aria-hidden="true" />
                      <div className="notification-row-main">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <small>{formatDate(notification.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Full Width Bottom: MoveCare AI Clinical Recommendations & Insights Suite */}
        <div style={{ marginTop: '2.5rem' }}>
          <RecommendationPanel />
        </div>

        {/* Modal 1: Full Clinical Profile Dossier Modal */}
        {viewProfileOpen && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="view-profile-title" onClick={() => setViewProfileOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '640px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="hero-avatar-v2" style={{ width: '3.5rem', height: '3.5rem', fontSize: '1.4rem' }}>
                    {(profile?.name || user?.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 id="view-profile-title" style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>
                      {profile?.name || user?.name}
                    </h3>
                    <small style={{ color: '#64748b' }}>{profile?.email || user?.email}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setViewProfileOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Dossier Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0d9488', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Medical Condition
                  </span>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                    {profile?.medicalCondition && profile.medicalCondition !== 'Profile setup required' ? profile.medicalCondition : 'Not specified'}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0d9488', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Attending Clinician
                  </span>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                    {profile?.assignedTherapist?.name || 'MoveCare Clinical Team'}
                  </strong>
                  <small style={{ display: 'block', color: '#64748b', marginTop: '0.15rem' }}>
                    {profile?.assignedTherapist?.specialization || 'Physical Therapy Specialist'}
                  </small>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Date of Birth
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    {formatDate(profile?.dateOfBirth)}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Gender
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    {profile?.gender || 'Not specified'}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Contact Phone
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    {profile?.phoneNumber || 'Not provided'}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                    Care Status
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span className="status-dot active" />
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      {profile?.status || 'Active Patient'}
                    </strong>
                  </div>
                </div>
              </div>

              {profile?.injuryDescription && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.85rem', padding: '1rem', marginBottom: '1.5rem' }}>
                  <strong style={{ color: '#166534', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>
                    📋 Clinical Symptoms & Injury Notes:
                  </strong>
                  <p style={{ margin: 0, color: '#14532d', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    {profile.injuryDescription}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setViewProfileOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleOpenEditProfile}
                >
                  ✏️ Edit Profile Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Clinical Profile Edit Modal */}
        {editProfileOpen && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-profile-modal-title" onClick={() => !profileSaving && setEditProfileOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '540px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div>
                  <span className="card-eyebrow">Patient Identity</span>
                  <h3 id="edit-profile-modal-title" style={{ margin: 0 }}>Update Clinical Profile</h3>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => !profileSaving && setEditProfileOpen(false)}
                  disabled={profileSaving}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {profileError && <div className="form-error" role="alert" style={{ marginBottom: '1rem' }}>{profileError}</div>}

              <form onSubmit={handleSaveProfile} className="assignment-form">
                <label>
                  Full Name
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                    placeholder="Your legal or preferred name"
                    required
                  />
                </label>

                <label>
                  Medical Condition / Target Rehab Area
                  <input
                    type="text"
                    value={profileFormData.medicalCondition}
                    onChange={(e) => setProfileFormData({ ...profileFormData, medicalCondition: e.target.value })}
                    placeholder="e.g. Knee Patellar Tendinitis, Shoulder Impingement"
                    required
                  />
                </label>

                <label>
                  Injury Description & Symptoms
                  <textarea
                    value={profileFormData.injuryDescription}
                    onChange={(e) => setProfileFormData({ ...profileFormData, injuryDescription: e.target.value })}
                    placeholder="Describe pain triggers, previous surgery, or symptoms..."
                    rows={3}
                  />
                </label>

                <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label>
                    Date of Birth
                    <input
                      type="date"
                      value={profileFormData.dateOfBirth}
                      onChange={(e) => setProfileFormData({ ...profileFormData, dateOfBirth: e.target.value })}
                    />
                  </label>

                  <label>
                    Gender
                    <select
                      value={profileFormData.gender}
                      onChange={(e) => setProfileFormData({ ...profileFormData, gender: e.target.value })}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </label>
                </div>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    value={profileFormData.phoneNumber}
                    onChange={(e) => setProfileFormData({ ...profileFormData, phoneNumber: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </label>

                <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setEditProfileOpen(false)}
                    disabled={profileSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving Updates...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Pain Journal Check-in Modal */}
        {journalModalOpen && (
          <PainJournalFormModal
            initialEntry={journalModalEntry}
            onClose={() => {
              if (!journalSubmitting) {
                setJournalModalOpen(false)
                setJournalModalEntry(null)
                setJournalError('')
              }
            }}
            onSubmit={handleSaveJournal}
            submitting={journalSubmitting}
            error={journalError}
          />
        )}
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
  const todayDateStr = new Date().toISOString().split('T')[0]
  const thirtyDaysLaterStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [exercises, setExercises] = useState([])
  const [options, setOptions] = useState({ patients: [], exercises: [] })
  const [form, setForm] = useState(emptyExercise)
  const [assignment, setAssignment] = useState({
    patientId: '',
    exerciseId: '',
    planName: '',
    startDate: todayDateStr,
    endDate: thirtyDaysLaterStr,
    frequency: 'Daily',
  })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [exerciseData, optionData] = await Promise.all([
        apiRequest('/exercises'),
        apiRequest('/exercises/assignment-options'),
      ])
      setExercises(exerciseData)
      setOptions(optionData)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleExerciseSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setNotice('')
      const saved = await apiRequest(editingId ? `/exercises/${editingId}` : '/exercises', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })
      setExercises((current) =>
        editingId ? current.map((item) => (item._id === saved._id ? saved : item)) : [saved, ...current]
      )
      setForm(emptyExercise)
      setEditingId(null)
      setNotice(editingId ? 'Exercise updated.' : 'Exercise created.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (exercise) => {
    if (!window.confirm(`Delete ${exercise.name}?`)) return
    try {
      await apiRequest(`/exercises/${exercise._id}`, { method: 'DELETE' })
      setExercises((current) => current.filter((item) => item._id !== exercise._id))
      setNotice('Exercise deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const handleAssignment = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setNotice('')
      await apiRequest('/exercises/assign', { method: 'POST', body: JSON.stringify(assignment) })
      setAssignment({
        patientId: '',
        exerciseId: '',
        planName: '',
        startDate: todayDateStr,
        endDate: thirtyDaysLaterStr,
        frequency: 'Daily',
      })
      setNotice('Exercise assigned to the patient successfully.')
      await loadData()
    } catch (assignmentError) {
      setError(assignmentError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="container management-wrap">
        <div className="management-heading">
          <div>
            <span className="eyebrow accent">Therapist workspace</span>
            <h2>Exercise management</h2>
            <p>Create a library of clear, trackable exercises and assign them to your patients.</p>
          </div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <div className="management-layout">
          <section className="management-panel">
            <h3>{editingId ? 'Edit exercise' : 'Create exercise'}</h3>
            <ExerciseForm
              form={form}
              setForm={setForm}
              onSubmit={handleExerciseSubmit}
              editing={Boolean(editingId)}
              onCancel={() => {
                setEditingId(null)
                setForm(emptyExercise)
              }}
              loading={saving}
            />
          </section>
          <section className="management-panel">
            <h3>Assign an exercise</h3>
            <form className="assignment-form" onSubmit={handleAssignment}>
              <label>
                Patient
                <select
                  value={assignment.patientId}
                  onChange={(event) => setAssignment({ ...assignment, patientId: event.target.value })}
                  required
                >
                  <option value="">Select patient</option>
                  {options.patients.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.user?.name || patient.user?.email || 'Patient'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Exercise
                <select
                  value={assignment.exerciseId}
                  onChange={(event) => setAssignment({ ...assignment, exerciseId: event.target.value })}
                  required
                >
                  <option value="">Select exercise</option>
                  {options.exercises.map((exercise) => (
                    <option key={exercise._id} value={exercise._id}>
                      {exercise.name} ({exercise.targetBodyPart})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plan name
                <input
                  value={assignment.planName}
                  onChange={(event) => setAssignment({ ...assignment, planName: event.target.value })}
                  placeholder="e.g. Knee recovery week 1"
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  Start date
                  <input
                    type="date"
                    value={assignment.startDate}
                    onChange={(event) => setAssignment({ ...assignment, startDate: event.target.value })}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={assignment.endDate}
                    onChange={(event) => setAssignment({ ...assignment, endDate: event.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                Frequency
                <select
                  value={assignment.frequency}
                  onChange={(event) => setAssignment({ ...assignment, frequency: event.target.value })}
                >
                  <option value="Daily">Daily</option>
                  <option value="Every2Days">Every 2 days</option>
                  <option value="EveryOtherDay">Every other day</option>
                  <option value="Twice">Twice a week</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </label>
              <button className="primary-btn" disabled={saving || !options.patients.length}>
                {saving ? 'Assigning...' : 'Assign exercise'}
              </button>
            </form>
          </section>
        </div>
        <section className="management-panel exercise-library">
          <div className="panel-heading">
            <div>
              <span className="card-eyebrow">Your library</span>
              <h3>Exercises</h3>
            </div>
            <span className="count-badge">{loading ? '...' : exercises.length}</span>
          </div>
          {loading ? (
            <div className="dashboard-loading">Loading exercises...</div>
          ) : exercises.length ? (
            <div className="exercise-library-grid">
              {exercises.map((exercise) => (
                <article className="library-item" key={exercise._id}>
                  <div className="library-item-top">
                    <span className="exercise-category">{exercise.category}</span>
                    <span className="difficulty-tag">{exercise.difficulty}</span>
                  </div>
                  <h4>{exercise.name}</h4>
                  <p>{exercise.description}</p>
                  <div className="exercise-meta">
                    <span>{exercise.targetBodyPart}</span>
                    <span>{exercise.duration} min</span>
                    <span>
                      {exercise.sets} × {exercise.reps}
                    </span>
                  </div>
                  <div className="library-actions">
                    <button
                      type="button"
                      className="secondary-btn small"
                      onClick={() => {
                        setEditingId(exercise._id)
                        setForm(exercise)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDelete(exercise)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">Create your first exercise to start building the library.</p>
          )}
        </section>
      </div>
    </main>
  )
}

function PatientExercisesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('today')
  const [activeModalItem, setActiveModalItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [toastNotice, setToastNotice] = useState('')
  const [activatingStarter, setActivatingStarter] = useState(false)
  const [starterError, setStarterError] = useState('')

  const handleActivateStarter = async () => {
    try {
      setActivatingStarter(true)
      setStarterError('')
      await apiRequest('/exercises/patient/starter-plan', { method: 'POST' })
      setToastNotice('✨ Your personalized clinical rehabilitation routine is now active!')
      setTimeout(() => setToastNotice(''), 6000)
      await loadExercises()
    } catch (err) {
      setStarterError(err.message || 'Unable to activate routine. Please try again.')
    } finally {
      setActivatingStarter(false)
    }
  }

  const loadExercises = async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/exercises/patient/assigned')
      setData(res)
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Failed to load assigned exercises.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExercises()
  }, [])

  const handleComplete = async (exerciseId, planId, completionData) => {
    try {
      setSubmitting(true)
      setModalError('')
      await apiRequest(`/exercises/patient/${exerciseId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          planId,
          painLevel: completionData.painLevel,
          mobilityScore: completionData.mobilityScore,
          notes: completionData.notes,
        }),
      })
      setActiveModalItem(null)
      setToastNotice('🎉 Exercise completed and progress saved to your care team!')
      setTimeout(() => setToastNotice(''), 5000)
      await loadExercises()
    } catch (err) {
      setModalError(err.message || 'Unable to record exercise completion. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) {
    return <LoadingDashboard />
  }

  if (error && !data) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error-card" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <h3>Unable to Load Exercises</h3>
            <p>{error}</p>
            <button type="button" className="primary-btn" onClick={loadExercises}>
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Today boundaries
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = todayStart + 86400000

  // Build progress lookup map
  const progressList = Array.isArray(data?.progress) ? data.progress : []
  const todayCompletedSet = new Set()
  const latestProgressMap = new Map()

  progressList.forEach((p) => {
    const exId = String(p.exercise?._id || p.exercise || '')
    const planId = String(p.exercisePlan?._id || p.exercisePlan || '')
    const key = `${exId}-${planId}`

    if (!latestProgressMap.has(key)) {
      latestProgressMap.set(key, p)
    }
    if (!latestProgressMap.has(exId)) {
      latestProgressMap.set(exId, p)
    }

    if (p.completionStatus === 'Completed' && p.datePerformed) {
      const pTime = new Date(p.datePerformed).getTime()
      if (pTime >= todayStart && pTime < todayEnd) {
        todayCompletedSet.add(key)
        todayCompletedSet.add(exId)
      }
    }
  })

  const daysElapsedSince = (startDate) => {
    if (!startDate) return 0
    const start = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), new Date(startDate).getDate()).getTime()
    return Math.max(0, Math.floor((todayStart - start) / 86400000))
  }

  const isItemScheduledToday = (item, planStartDate) => {
    const freq = item.frequency || 'Daily'
    if (freq === 'Daily') return true
    const days = daysElapsedSince(planStartDate)
    if (freq === 'Every2Days' || freq === 'EveryOtherDay') return days % 2 === 0
    if (freq === 'Weekly') return days % 7 === 0
    if (freq === 'Twice') return days % 3 === 0
    return true
  }

  // Flatten plans into exercise items
  const plans = Array.isArray(data?.plans) ? data.plans : []
  const allItems = plans.flatMap((plan) => {
    const planExercises = Array.isArray(plan.exercises) ? plan.exercises : []
    return planExercises
      .filter((item) => item && item.exercise)
      .map((item, index) => {
        const ex = item.exercise || {}
        const exId = String(ex._id || `ex-${index}`)
        const planId = String(plan._id || '')
        const key = `${exId}-${planId}`
        const isCompletedToday = todayCompletedSet.has(key) || todayCompletedSet.has(exId)
        const latestProg = latestProgressMap.get(key) || latestProgressMap.get(exId)
        const isScheduledToday = isItemScheduledToday(item, plan.startDate)

        return {
          ...item,
          exercise: ex,
          planId: plan._id,
          planName: plan.name || 'Rehabilitation Plan',
          isCompletedToday,
          isScheduledToday,
          painLevel: isCompletedToday ? latestProg?.painLevel : undefined,
          completedAt: isCompletedToday ? latestProg?.datePerformed : undefined,
          notes: isCompletedToday ? latestProg?.notes : undefined,
        }
      })
  })

  // Extract distinct categories
  const categories = Array.from(
    new Set(
      allItems
        .map((item) => item.exercise?.category)
        .filter(Boolean)
    )
  )

  // Counts
  const counts = {
    all: allItems.length,
    today: allItems.filter((i) => i.isScheduledToday).length,
    completed: allItems.filter((i) => i.isScheduledToday && i.isCompletedToday).length,
    pending: allItems.filter((i) => i.isScheduledToday && !i.isCompletedToday).length,
  }

  // Filter items
  const filteredItems = allItems.filter((item) => {
    const ex = item.exercise || {}
    // Status filter
    const effectiveStatus = (selectedStatus === 'today' && counts.today === 0 && counts.all > 0) ? 'all' : selectedStatus
    if (effectiveStatus === 'today' && !item.isScheduledToday) return false
    if (effectiveStatus === 'completed' && !item.isCompletedToday) return false
    if (effectiveStatus === 'pending' && (!item.isScheduledToday || item.isCompletedToday)) return false

    // Category filter
    if (selectedCategory !== 'all' && ex.category !== selectedCategory) return false

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = (ex.name || '').toLowerCase().includes(q)
      const matchPart = (ex.targetBodyPart || '').toLowerCase().includes(q)
      const matchDesc = (ex.description || '').toLowerCase().includes(q)
      const matchPlan = (item.planName || '').toLowerCase().includes(q)
      if (!matchName && !matchPart && !matchDesc && !matchPlan) return false
    }

    return true
  })

  return (
    <main className="page-shell patient-exercises-shell">
      <div className="container management-wrap patient-exercises-wrap">
        {/* Toast Notification */}
        {toastNotice && (
          <div className="toast-success-banner" role="status">
            {toastNotice}
          </div>
        )}

        {/* Page Header */}
        <div className="management-heading exercises-page-header">
          <div>
            <span className="eyebrow accent">Personalized Exercise Center</span>
            <h2>Your Movement Routine</h2>
            <p>
              Perform each prescribed exercise with proper form, monitor your joint comfort, and log your session.
            </p>
          </div>
          <div className="header-stats-pill">
            <span>Today&apos;s Progress:</span>
            <strong>
              {counts.today > 0
                ? `${counts.completed} / ${counts.today} completed`
                : counts.all > 0
                  ? `${counts.completed} completed today (${counts.all} assigned)`
                  : '0 / 0 completed'}
            </strong>
          </div>
        </div>

        {/* Filters and Search Bar */}
        {allItems.length > 0 && (
          <ExerciseFilters
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            categories={categories}
            counts={counts}
          />
        )}

        {/* Exercise Grid or Empty States */}
        {filteredItems.length > 0 ? (
          <div className="patient-exercise-cards-grid">
            {filteredItems.map((item, index) => {
              const exId = item.exercise?._id || `item-${index}`
              return (
                <ExerciseCard
                  key={`${item.planId || 'plan'}-${exId}`}
                  item={item}
                  onOpenDetail={(target) => {
                    setModalError('')
                    setActiveModalItem(target)
                  }}
                  onQuickComplete={(target) => {
                    setModalError('')
                    setActiveModalItem(target)
                  }}
                />
              )
            })}
          </div>
        ) : allItems.length > 0 ? (
          <div className="dashboard-panel filter-empty-panel">
            <span className="empty-icon" aria-hidden="true">🔍</span>
            <h3>No exercises match your filter</h3>
            <p>
              {selectedStatus === 'today' && counts.today === 0
                ? `You have ${counts.all} exercises assigned in your program, but none are scheduled for today.`
                : 'Try clearing your search query or switching tabs.'}
            </p>
            <button
              type="button"
              className="secondary-btn small"
              onClick={() => {
                setSearch('')
                setSelectedCategory('all')
                setSelectedStatus('all')
              }}
            >
              View All {allItems.length} Assigned Exercises
            </button>
          </div>
        ) : (
          <div className="dashboard-panel empty-assigned-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#fff', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <span className="empty-icon" aria-hidden="true" style={{ fontSize: '3.2rem', display: 'inline-block', marginBottom: '1rem' }}>📋</span>
            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '0.5rem', fontWeight: 700 }}>No Assigned Exercises Yet</h3>
            <p style={{ maxWidth: '560px', margin: '0 auto 1.5rem', color: '#64748b', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Your clinical account has not received a prescribed routine yet. You can instantly activate our evidence-based clinical starter routine tailored to your condition, or wait for your therapist to prescribe one.
            </p>
            {starterError && <div className="form-error" role="alert" style={{ maxWidth: '480px', margin: '0 auto 1.25rem' }}>{starterError}</div>}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-btn"
                disabled={activatingStarter}
                onClick={handleActivateStarter}
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {activatingStarter ? '✨ Activating Clinical Plan...' : '✨ Activate Tailored Rehabilitation Routine'}
              </button>
              <NavLink to="/dashboard" className="secondary-btn" style={{ padding: '0.75rem 1.25rem' }}>
                Return to Dashboard
              </NavLink>
            </div>
          </div>
        )}

        {/* Exercise Detail & Completion Modal */}
        {activeModalItem && (
          <ExerciseDetailModal
            item={activeModalItem}
            onClose={() => {
              if (!submitting) {
                setActiveModalItem(null)
                setModalError('')
              }
            }}
            onComplete={handleComplete}
            submitting={submitting}
            submitError={modalError}
          />
        )}
      </div>
    </main>
  )
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProgress = async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/progress/me')
      setData(res)
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load recovery progress.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProgress()
  }, [])

  if (loading && !data) {
    return <LoadingDashboard />
  }

  if (error && !data) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error-card" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <h3>Unable to Load Progress</h3>
            <p>{error}</p>
            <button type="button" className="primary-btn" onClick={loadProgress}>
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  const entries = Array.isArray(data?.entries) ? data.entries : []

  return (
    <main className="page-shell progress-page patient-progress-page">
      <div className="container management-wrap patient-progress-wrap">
        {/* Progress Tracker Hero */}
        <div className="management-heading progress-page-hero">
          <div>
            <span className="eyebrow accent">Recovery Progress Tracker</span>
            <h2>Your Rehabilitation Analytics</h2>
            <p>
              Review your exercise adherence, workout consistency streaks, weekly matrix, monthly milestones, and clinical comfort curves.
            </p>
          </div>
          <button
            type="button"
            className="refresh-dashboard-btn"
            onClick={loadProgress}
            disabled={loading}
            title="Refresh progress data"
          >
            {loading ? 'Updating...' : '🔄 Refresh Analytics'}
          </button>
        </div>

        {/* Top Tier: Overview & Weekly 7-Day Matrix */}
        <div className="progress-dual-grid">
          <ProgressOverviewCard overview={data?.overview} />
          <WeeklyProgressChart weekly={data?.weekly} />
        </div>

        {/* Middle Tier: Monthly Summary & Completion Trend */}
        <div className="progress-dual-grid">
          <MonthlySummaryCard monthly={data?.monthly} />
          <CompletionTrendChart completionTrend={data?.completionTrend} />
        </div>

        {/* Bottom Tier: Pain & Mobility Trends */}
        <div className="progress-dual-grid">
          <PainTrendCard painTrend={data?.painTrend} />
          <MobilityTrendCard mobilityTrend={data?.mobilityTrend} />
        </div>

        {/* Full Session History Table */}
        <section className="dashboard-card progress-history-panel" aria-labelledby="session-history-title">
          <div className="dashboard-card-heading">
            <span className="card-eyebrow">Audit Trail</span>
            <div className="history-heading-row">
              <h3 id="session-history-title">Complete Exercise Log History</h3>
              <span className="history-count-badge">
                <strong>{entries.length}</strong> {entries.length === 1 ? 'record' : 'records'} logged
              </span>
            </div>
          </div>

          {entries.length > 0 ? (
            <div className="progress-table-wrap">
              <div className="progress-table">
                <div className="progress-table-header">
                  <span>Date</span>
                  <span>Exercise</span>
                  <span>Status</span>
                  <span>Pain Level</span>
                  <span>Mobility</span>
                  <span>Notes</span>
                </div>
                {entries
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div className="progress-table-row" key={entry._id}>
                      <span className="table-date">{formatDate(entry.datePerformed)}</span>
                      <strong className="table-ex-name">{entry.exercise?.name || 'Assigned Exercise'}</strong>
                      <span>
                        <span className={`completion-tag ${entry.completionStatus === 'Completed' ? 'complete' : ''}`}>
                          {entry.completionStatus}
                        </span>
                      </span>
                      <span className="table-pain">
                        {entry.painLevel !== undefined && entry.painLevel !== null ? `${entry.painLevel}/10` : '--'}
                      </span>
                      <span className="table-mobility">
                        {entry.mobilityScore !== undefined && entry.mobilityScore !== null ? `${entry.mobilityScore}/100` : '--'}
                      </span>
                      <span className="table-notes" title={entry.notes || ''}>
                        {entry.notes ? `"${entry.notes}"` : <span className="empty-dash">--</span>}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="history-empty-state">
              <span className="empty-icon" aria-hidden="true">📋</span>
              <h4>No exercise progress available yet.</h4>
              <p>When you perform and log prescribed exercises, every session will appear in this clinical log.</p>
              <NavLink to="/my-exercises" className="primary-btn small">
                Start an Exercise
              </NavLink>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your MoveCare AI Recovery Guide. I can explain your assigned exercises, review your pain journal trends, check upcoming appointments, and share musculoskeletal wellness tips.',
    },
  ])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (customText) => {
    const textToSend = (typeof customText === 'string' ? customText : message).trim()
    if (!textToSend) return
    setMessages((current) => [...current, { role: 'user', text: textToSend }])
    setMessage('')
    setLoading(true)
    setError('')
    try {
      const response = await apiRequest('/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: textToSend }),
      })
      setMessages((current) => [...current, { role: 'assistant', text: response.answer }])
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setLoading(false)
    }
  }

  const prompts = [
    'What are my prescribed exercises for today?',
    'How does my recent pain trend look?',
    'When is my next upcoming appointment?',
    'How is my recovery progress calculated?',
    'What should I do if pain worsens during exercise?',
  ]

  return (
    <main className="page-shell assistant-page">
      <div className="container assistant-wrap">
        <div className="management-heading">
          <span className="eyebrow accent">MoveCare AI Feature</span>
          <h2>Clinical Recovery Assistant</h2>
          <p>
            An interactive educational guide connected to your MoveCare care records. It provides safe, supportive guidance and does not provide clinical diagnoses.
          </p>
        </div>

        <section className="assistant-panel">
          <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="secondary-btn small"
                style={{ fontSize: '0.78rem', borderRadius: '999px', padding: '0.35rem 0.75rem' }}
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="assistant-messages">
            {messages.map((item, index) => (
              <div className={`assistant-message ${item.role}`} key={`${item.role}-${index}`}>
                <span>{item.role === 'assistant' ? 'MoveCare AI' : 'You'}</span>
                <p>{item.text}</p>
              </div>
            ))}
            {loading && (
              <div className="assistant-message assistant">
                <span>MoveCare AI</span>
                <p>Analyzing care records...</p>
              </div>
            )}
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form
            className="assistant-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about your routine, pain trend, exercises, or appointments..."
              aria-label="Ask the recovery assistant"
              disabled={loading}
            />
            <button className="primary-btn" disabled={loading || !message.trim()}>
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </form>

          <p className="ai-disclaimer">
            Non-Diagnostic Notice: This assistant is an educational software tool. It does not replace a licensed healthcare professional or provide medical diagnoses. For acute symptoms or injuries, contact your healthcare provider.
          </p>
        </section>
      </div>
    </main>
  )
}


function TherapistProgressPage() {
  const [patients, setPatients] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    apiRequest('/progress/patients')
      .then((data) => {
        setPatients(data)
        const requestedId = searchParams.get('patient')
        setSelectedId(data.some((item) => item.patient._id === requestedId) ? requestedId : data[0]?.patient?._id || '')
      })
      .catch((loadError) => setError(loadError.message))
  }, [searchParams])

  useEffect(() => {
    if (selectedId) {
      apiRequest(`/progress/patients/${selectedId}`)
        .then(setDetail)
        .catch((loadError) => setError(loadError.message))
      setLoadingSummary(true)
      apiRequest(`/ai/therapist/patients/${selectedId}/summary`)
        .then((res) => setAiSummary(res.summary))
        .catch(() => setAiSummary(null))
        .finally(() => setLoadingSummary(false))
    }
  }, [selectedId])

  if (error && !patients) return <main className="page-shell"><div className="container dashboard-wrap"><div className="dashboard-error" role="alert">{error}</div></div></main>
  return (
    <main className="page-shell">
      <div className="container management-wrap">
        <div className="management-heading">
          <span className="eyebrow accent">Therapist workspace</span>
          <h2>Patient progress & clinical management</h2>
          <p>Review adherence, session signals, assigned plans, pain journal, and attendance for your assigned patients.</p>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="therapist-progress-layout">
          <section className="management-panel patient-progress-list">
            <h3>Assigned patients</h3>
            {patients.length ? (
              patients.map((item) => (
                <button
                  type="button"
                  className={`patient-progress-option ${selectedId === item.patient._id ? 'selected' : ''}`}
                  key={item.patient._id}
                  onClick={() => setSelectedId(item.patient._id)}
                >
                  <span className="therapist-initial">{item.patient.user?.name?.charAt(0)}</span>
                  <span>
                    <strong>{item.patient.user?.name}</strong>
                    <small>{item.patient.medicalCondition} · {item.summary.exerciseAdherence}% adherence</small>
                  </span>
                </button>
              ))
            ) : (
              <p className="empty-state">No assigned patients found.</p>
            )}
          </section>
          {detail ? (
            <section className="patient-progress-detail">
              <div className="progress-detail-heading">
                <div>
                  <span className="eyebrow accent">Patient record</span>
                  <h3>{detail.patient.user?.name}</h3>
                  <p>{detail.patient.medicalCondition} · {detail.patient.injuryDescription || 'No injury notes'}</p>
                </div>
              </div>
              <div className="progress-metrics">
                <ProgressMetric label="Adherence" value={detail.summary.exerciseAdherence} suffix="%" />
                <ProgressMetric label="Completed" value={detail.summary.completedSessions} />
                <ProgressMetric label="Mobility" value={detail.summary.mobilityScore} suffix="/100" />
                <ProgressMetric label="Attendance" value={detail.summary.appointmentAttendance} suffix="%" />
              </div>
              <div className="progress-chart-grid">
                <section className="management-panel chart-panel">
                  <h3>Completion trend</h3>
                  <ProgressChart data={detail.timeline} dataKey="completionRate" color="#0d8b85" emptyLabel="No completion data yet." />
                </section>
                <section className="management-panel chart-panel">
                  <h3>Mobility trend</h3>
                  <ProgressChart data={detail.timeline.filter((item) => item.mobilityScore !== null)} dataKey="mobilityScore" color="#2b77d1" emptyLabel="No mobility data yet." />
                </section>
              </div>

              {/* Feature 5: Therapist AI Clinical Summary */}
              <section className="management-panel" style={{ marginTop: '1.5rem', background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                <div className="panel-heading">
                  <div>
                    <span className="card-eyebrow" style={{ color: '#0d8b85' }}>MoveCare AI Assistant</span>
                    <h3>Clinical Summary & Adherence Review</h3>
                  </div>
                </div>
                {loadingSummary ? (
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Synthesizing clinical signals from MongoDB...</p>
                ) : aiSummary ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                      <strong>Clinical Overview: </strong>{aiSummary.clinicalNotes}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #ccfbf1' }}>
                        <strong style={{ color: '#0d8b85', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>Pain Trend</strong>
                        <span>{aiSummary.painTrend}</span>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #ccfbf1' }}>
                        <strong style={{ color: '#0d8b85', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>Recent Progress</strong>
                        <span>{aiSummary.recentProgress}</span>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #ccfbf1' }}>
                        <strong style={{ color: '#0d8b85', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>Upcoming Consultation</strong>
                        <span>{aiSummary.upcomingAppointment}</span>
                      </div>
                    </div>
                    {aiSummary.completedExercises?.length > 0 && (
                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                        <strong>Completed Exercises: </strong>{aiSummary.completedExercises.join(', ')}
                      </div>
                    )}
                    <small style={{ color: '#64748b', fontStyle: 'italic' }}>
                      Assistive Clinician Summary · Aggregated from patient-reported entries and clinical logs.
                    </small>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>AI clinical summary will update as patient records accrue.</p>
                )}
              </section>

              {/* Assigned Exercises & Plans */}
              <section className="management-panel" style={{ marginTop: '1.5rem' }}>
                <div className="panel-heading">
                  <div>
                    <span className="card-eyebrow">Prescriptions</span>
                    <h3>Assigned exercises</h3>
                  </div>
                </div>
                {detail.plans?.length ? (
                  <div className="exercise-library-grid">
                    {detail.plans.flatMap((plan) =>
                      (plan.exercises || []).map((item, idx) => (
                        <article className="library-item" key={item.exercise?._id || `${plan._id}-${idx}`}>
                          <div className="library-item-top">
                            <span className="exercise-category">{item.exercise?.category || 'Rehab'}</span>
                            <span className="difficulty-tag">{item.exercise?.difficulty || 'Medium'}</span>
                          </div>
                          <h4>{item.exercise?.name || 'Assigned Exercise'}</h4>
                          <p>{item.exercise?.description || plan.name}</p>
                          <div className="exercise-meta">
                            <span>{item.exercise?.targetBodyPart || 'Target area'}</span>
                            <span>{item.frequency || 'Daily'}</span>
                            {item.exercise?.duration && <span>{item.exercise.duration} min</span>}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="empty-state">No exercise plans currently assigned to this patient.</p>
                )}
              </section>

              {/* Pain & Mobility Journal Tracking */}
              <section className="management-panel" style={{ marginTop: '1.5rem' }}>
                <div className="panel-heading">
                  <div>
                    <span className="card-eyebrow">Self-reported signals</span>
                    <h3>Pain tracking & journal history</h3>
                  </div>
                  <span className="count-badge">{detail.painJournal?.length || 0} entries</span>
                </div>
                {detail.painJournal?.length ? (
                  <div className="appointment-list">
                    {detail.painJournal.slice().reverse().map((entry) => (
                      <article className="appointment-row" key={entry._id}>
                        <div className="appointment-date">
                          <strong>{entry.dateString || formatDate(entry.date || entry.createdAt)}</strong>
                          <span>Pain: {entry.painLevel}/10</span>
                        </div>
                        <div className="appointment-main">
                          <strong>{entry.bodyPart} · Mobility: {entry.mobilityScore}/100</strong>
                          <span>{entry.symptoms?.join(', ') || 'No specific symptoms noted'}</span>
                          {entry.notes && <small>"{entry.notes}"</small>}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No pain tracking entries logged yet by this patient.</p>
                )}
              </section>

              {/* Appointment History */}
              <section className="management-panel" style={{ marginTop: '1.5rem' }}>
                <div className="panel-heading">
                  <div>
                    <span className="card-eyebrow">Consultations</span>
                    <h3>Appointment history</h3>
                  </div>
                  <span className="count-badge">{detail.appointments?.length || 0}</span>
                </div>
                {detail.appointments?.length ? (
                  <div className="appointment-list">
                    {detail.appointments.slice().reverse().map((appt) => (
                      <article className="appointment-row" key={appt._id}>
                        <div className="appointment-date">
                          <strong>{formatDate(appt.appointmentDate)}</strong>
                          <span>{appt.startTime} - {appt.endTime}</span>
                        </div>
                        <div className="appointment-main">
                          <strong>{appt.type} · {appt.consultationMode}</strong>
                          <small>{appt.notes || 'No visit notes'}</small>
                        </div>
                        <AppointmentStatus status={appt.status} />
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No appointments recorded for this patient.</p>
                )}
              </section>
            </section>
          ) : (
            <div className="management-panel">
              <p className="empty-state">Select a patient to view progress.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
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
  const [notice, setNotice] = useState('')
  const [reschedulingId, setReschedulingId] = useState('')
  const [rescheduleData, setRescheduleData] = useState({ date: '', startTime: '10:00', endTime: '10:45' })

  const load = async () => {
    try {
      setAppointments(await apiRequest('/appointments/therapist'))
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const manage = async (appointment, status, additionalBody = {}) => {
    try {
      setError('')
      setNotice('')
      await apiRequest(`/appointments/${appointment._id}/manage`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...additionalBody }),
      })
      await load()
      setNotice(`Appointment updated to ${status}.`)
    } catch (manageError) {
      setError(manageError.message)
    }
  }

  const handleReschedule = async (appointment) => {
    if (!rescheduleData.date || !rescheduleData.startTime || !rescheduleData.endTime) {
      setError('Please provide date, start time, and end time for rescheduling.')
      return
    }
    try {
      setError('')
      setNotice('')
      await apiRequest(`/appointments/${appointment._id}/manage`, {
        method: 'PATCH',
        body: JSON.stringify({
          date: rescheduleData.date,
          startTime: rescheduleData.startTime,
          endTime: rescheduleData.endTime,
        }),
      })
      setReschedulingId('')
      await load()
      setNotice('Appointment successfully rescheduled.')
    } catch (rescheduleError) {
      setError(rescheduleError.message)
    }
  }

  if (error && !appointments) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error" role="alert">{error}</div>
        </div>
      </main>
    )
  }
  if (!appointments) return <LoadingDashboard />

  return (
    <main className="page-shell">
      <div className="container management-wrap">
        <div className="management-heading">
          <span className="eyebrow accent">Therapist workspace</span>
          <h2>Appointment schedule & consultations</h2>
          <p>Confirm visits, manage status, reschedule, and open the consultation room when it is time.</p>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <section className="management-panel appointment-list-panel">
          <div className="appointment-list">
            {appointments.length ? (
              appointments.map((appointment) => (
                <article className="appointment-row" key={appointment._id}>
                  <div className="appointment-date">
                    <strong>{formatDate(appointment.appointmentDate)}</strong>
                    <span>{appointment.startTime} - {appointment.endTime}</span>
                  </div>
                  <div className="appointment-main">
                    <strong>{appointment.patient?.user?.name}</strong>
                    <span>{appointment.patient?.medicalCondition || 'No condition recorded'}</span>
                    <small>{appointment.type} · {appointment.consultationMode} {appointment.notes ? `· "${appointment.notes}"` : ''}</small>
                  </div>
                  <AppointmentStatus status={appointment.status} />
                  <div className="appointment-actions">
                    {appointment.status === 'Scheduled' && (
                      <button className="primary-btn small" type="button" onClick={() => manage(appointment, 'Accepted')}>
                        Accept
                      </button>
                    )}
                    {appointment.status === 'Accepted' && (
                      <button className="primary-btn small" type="button" onClick={() => manage(appointment, 'InProgress')}>
                        Start
                      </button>
                    )}
                    <ConsultationLink appointment={appointment} />
                    {['Scheduled', 'Accepted'].includes(appointment.status) && (
                      <button
                        className="secondary-btn small"
                        type="button"
                        onClick={() => {
                          setReschedulingId(reschedulingId === appointment._id ? '' : appointment._id)
                          setRescheduleData({
                            date: new Date(appointment.appointmentDate).toISOString().slice(0, 10),
                            startTime: appointment.startTime,
                            endTime: appointment.endTime,
                          })
                        }}
                      >
                        {reschedulingId === appointment._id ? 'Cancel edit' : 'Reschedule'}
                      </button>
                    )}
                    {['Scheduled', 'Accepted'].includes(appointment.status) && (
                      <button className="danger-btn" type="button" onClick={() => manage(appointment, 'Cancelled', { reasonForCancellation: 'Declined by therapist' })}>
                        Decline
                      </button>
                    )}
                  </div>
                  {reschedulingId === appointment._id && (
                    <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        New Date:
                        <input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={rescheduleData.date}
                          onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                          style={{ marginLeft: '0.35rem', padding: '0.25rem 0.5rem' }}
                        />
                      </label>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        Start Time:
                        <input
                          type="time"
                          value={rescheduleData.startTime}
                          onChange={(e) => setRescheduleData({ ...rescheduleData, startTime: e.target.value })}
                          style={{ marginLeft: '0.35rem', padding: '0.25rem 0.5rem' }}
                        />
                      </label>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        End Time:
                        <input
                          type="time"
                          value={rescheduleData.endTime}
                          onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}
                          style={{ marginLeft: '0.35rem', padding: '0.25rem 0.5rem' }}
                        />
                      </label>
                      <button type="button" className="primary-btn small" onClick={() => handleReschedule(appointment)}>
                        Confirm Reschedule
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p className="empty-state">No appointments are scheduled.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function ConsultationPage({ user }) {
  const { id } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mutating, setMutating] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    apiRequest(`/appointments/${id}/consultation`)
      .then((data) => {
        setAppointment(data)
        setNotes(data.notes || '')
      })
      .catch((loadError) => setError(loadError.message))
  }, [id])

  useEffect(() => {
    let interval = null
    if (appointment?.consultationStatus === 'Live') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [appointment?.consultationStatus])

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const updateStatus = async (newConsultationStatus) => {
    try {
      setMutating(true)
      setError('')
      const updated = await apiRequest(`/appointments/${id}/consultation`, {
        method: 'PATCH',
        body: JSON.stringify({ consultationStatus: newConsultationStatus }),
      })
      setAppointment(updated)
      setNotice(`Session status updated to ${newConsultationStatus}.`)
    } catch (statusError) {
      setError(statusError.message)
    } finally {
      setMutating(false)
    }
  }

  const saveNotes = async (event) => {
    event?.preventDefault()
    try {
      setNotesSaving(true)
      setError('')
      const updated = await apiRequest(`/appointments/${id}/consultation`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      })
      setAppointment(updated)
      setNotice('Clinical notes saved to MongoDB.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setNotesSaving(false)
    }
  }

  if (error && !appointment) {
    return (
      <main className="page-shell">
        <div className="container dashboard-wrap">
          <div className="dashboard-error" role="alert">{error}</div>
        </div>
      </main>
    )
  }
  if (!appointment) return <LoadingDashboard />

  const isTherapist = user.role === 'Therapist'
  const otherPersonName = isTherapist
    ? appointment.patient?.user?.name || 'Patient'
    : appointment.therapist?.user?.name || 'Therapist'

  return (
    <main className="page-shell consultation-page">
      <div className="container consultation-wrap">
        <NavLink className="back-link" to={isTherapist ? '/therapist-appointments' : '/appointments'}>
          ← Back to appointments
        </NavLink>

        <div className="consultation-header">
          <div>
            <span className="eyebrow accent">MoveCare Virtual Telehealth Clinic</span>
            <h2>Virtual Consultation Room</h2>
            <p>
              {formatDate(appointment.appointmentDate)} · {appointment.startTime} - {appointment.endTime} · {appointment.type}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {appointment.consultationStatus === 'Live' && (
              <span className="count-badge" style={{ background: '#e02424', color: '#fff' }}>
                LIVE {formatTimer(elapsedSeconds)}
              </span>
            )}
            <AppointmentStatus status={appointment.consultationStatus} />
          </div>
        </div>

        {error && <div className="form-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}
        {notice && <div className="success-message" role="status" style={{ marginBottom: '1rem' }}>{notice}</div>}

        <section className="consultation-stage">
          <div className="video-placeholder" style={{ position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.78rem',
                opacity: 0.85,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: appointment.consultationStatus === 'Live' ? '#10b981' : appointment.consultationStatus === 'Waiting' ? '#f59e0b' : '#6b7280',
                  display: 'inline-block',
                }}
              />
              <span>{appointment.consultationStatus === 'Live' ? 'Encrypted Stream Active' : appointment.consultationStatus === 'Waiting' ? 'In Waiting Room' : 'Consultation Concluded'}</span>
            </div>

            <div className="video-avatar">
              {otherPersonName.charAt(0)}
            </div>
            <strong>{otherPersonName}</strong>
            <span>
              {appointment.consultationStatus === 'Live'
                ? `Active Clinical Session · Connected with ${otherPersonName}`
                : appointment.consultationStatus === 'Waiting'
                ? isTherapist
                  ? 'Patient is in the consultation room. Click "Start consultation" to begin.'
                  : 'Waiting for your therapist to start the live consultation...'
                : 'This clinical consultation has concluded.'}
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem', marginTop: '0.25rem' }}>
              <span className="count-badge" style={{ background: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)', color: '#fff' }}>
                {isMuted ? 'Mic Muted' : 'Mic On'}
              </span>
              <span className="count-badge" style={{ background: isCameraOff ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)', color: '#fff' }}>
                {isCameraOff ? 'Camera Off' : 'Camera On'}
              </span>
            </div>

            <div className="video-controls">
              <button
                type="button"
                className="secondary-btn small"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </button>

              <button
                type="button"
                className="secondary-btn small"
                onClick={() => setIsCameraOff(!isCameraOff)}
              >
                {isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              </button>

              {isTherapist && appointment.consultationStatus === 'Waiting' && (
                <button
                  type="button"
                  className="primary-btn small"
                  disabled={mutating}
                  onClick={() => updateStatus('Live')}
                >
                  {mutating ? 'Starting...' : 'Start consultation'}
                </button>
              )}

              {isTherapist && appointment.consultationStatus === 'Live' && (
                <button
                  type="button"
                  className="danger-btn small"
                  disabled={mutating}
                  onClick={() => updateStatus('Ended')}
                >
                  {mutating ? 'Ending...' : 'Complete & End Consultation'}
                </button>
              )}

              {!isTherapist && appointment.consultationStatus === 'Waiting' && (
                <button
                  type="button"
                  className="primary-btn small"
                  disabled={mutating}
                  onClick={() => updateStatus('Waiting')}
                >
                  Confirm Ready
                </button>
              )}
            </div>
          </div>

          <aside className="consultation-sidebar">
            <h3>Visit & Participant</h3>
            <dl className="profile-list">
              <div>
                <dt>{isTherapist ? 'Patient' : 'Therapist'}</dt>
                <dd><strong>{otherPersonName}</strong></dd>
              </div>
              {isTherapist ? (
                <>
                  <div>
                    <dt>Condition</dt>
                    <dd>{appointment.patient?.medicalCondition || 'Not recorded'}</dd>
                  </div>
                  <div>
                    <dt>Injury</dt>
                    <dd>{appointment.patient?.injuryDescription || 'Not recorded'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{appointment.patient?.user?.email}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Specialty</dt>
                    <dd>{appointment.therapist?.specialization || 'Physiotherapy'}</dd>
                  </div>
                  <div>
                    <dt>Experience</dt>
                    <dd>{appointment.therapist?.yearsOfExperience || 0} years</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{appointment.therapist?.user?.email}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Mode</dt>
                <dd>{appointment.consultationMode}</dd>
              </div>
              <div>
                <dt>Appt Status</dt>
                <dd><AppointmentStatus status={appointment.status} /></dd>
              </div>
              <div>
                <dt>Session State</dt>
                <dd><AppointmentStatus status={appointment.consultationStatus} /></dd>
              </div>
            </dl>

            <form onSubmit={saveNotes} style={{ marginTop: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Clinical Consultation Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isTherapist ? 'Record clinical assessment, range of motion observations, and next steps...' : 'Add questions or symptoms for your therapist...'}
                rows={4}
                style={{ width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.5rem', fontSize: '0.82rem' }}
              />
              <button
                type="submit"
                className="secondary-btn small"
                disabled={notesSaving}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                {notesSaving ? 'Saving...' : 'Save Consultation Notes'}
              </button>
            </form>

            <div className="consultation-note" style={{ marginTop: '1.25rem' }}>
              <strong>MoveCare Telehealth Session</strong>
              <p>
                Session status transitions and clinical consultation notes are persisted directly to your MongoDB record.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
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
    localStorage.removeItem('movecare-token')
    localStorage.removeItem('movecare-user')
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
          <Route path="/auth/google/callback" element={<GoogleCallbackPage onAuthComplete={handleAuthComplete} />} />

          <Route element={<ProtectedRoute user={user} />}>
            <Route path="/dashboard" element={user?.role === 'Patient' ? <PatientDashboardPage user={user} /> : user?.role === 'Therapist' ? <TherapistDashboardPage user={user} /> : user?.role === 'Admin' ? <AdminDashboardPage user={user} /> : <DashboardPage user={user} />} />
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/exercise-management" element={<ExerciseManagementPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/my-exercises" element={<PatientExercisesPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/therapist-appointments" element={<TherapistAppointmentsPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/appointments" element={<PatientAppointmentsPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Therapist" />}><Route path="/patient-progress" element={<TherapistProgressPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/progress" element={<PatientProgressPage />} /></Route>
            <Route element={<ProtectedRoute user={user} requiredRole="Patient" />}><Route path="/pain-journal" element={<PainJournalPage apiRequest={apiRequest} />} /></Route>
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
