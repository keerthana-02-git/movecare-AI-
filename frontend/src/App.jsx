import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'

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

function Navbar() {
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

        <a href="/contact" className="primary-btn small">
          Book a Consult
        </a>
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
              <a href="/services" className="primary-btn">Explore Services</a>
              <a href="/contact" className="secondary-btn">Talk to a Specialist</a>
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

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
