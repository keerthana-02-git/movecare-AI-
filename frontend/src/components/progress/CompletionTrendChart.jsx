import { useState } from 'react'

export default function CompletionTrendChart({ completionTrend }) {
  const [timeWindow, setTimeWindow] = useState('7') // '7' or '30'

  const series = timeWindow === '7'
    ? (completionTrend?.last7Days || [])
    : (completionTrend?.last30Days || [])

  const hasData = series.some((item) => (item.completed || 0) > 0)
  const maxVal = Math.max(...series.map((item) => item.completed || 0), 4)

  // SVG dimensions
  const width = 680
  const height = 200
  const paddingX = 35
  const paddingY = 25
  const graphWidth = width - paddingX * 2
  const graphHeight = height - paddingY * 2

  const points = series.map((item, index) => {
    const x = series.length === 1
      ? width / 2
      : paddingX + (index / (series.length - 1)) * graphWidth
    const value = item.completed || 0
    const y = paddingY + graphHeight - (value / maxVal) * graphHeight
    return { x, y, value, label: item.label, date: item.date }
  })

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaString = points.length
    ? `${points[0].x},${paddingY + graphHeight} ${pointsString} ${points[points.length - 1].x},${paddingY + graphHeight}`
    : ''

  return (
    <section className="dashboard-card completion-trend-card" aria-labelledby="completion-trend-title">
      <div className="dashboard-card-heading">
        <span className="card-eyebrow">Progression Timeline</span>
        <div className="trend-heading-row">
          <h3 id="completion-trend-title">Exercise Completion Trend</h3>

          {/* 7 Days | 30 Days Toggle */}
          <div className="trend-window-toggle" role="group" aria-label="Select trend window">
            <button
              type="button"
              className={`toggle-option-btn ${timeWindow === '7' ? 'active' : ''}`}
              onClick={() => setTimeWindow('7')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`toggle-option-btn ${timeWindow === '30' ? 'active' : ''}`}
              onClick={() => setTimeWindow('30')}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="trend-svg-wrapper">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="trend-chart-svg"
            role="img"
            aria-label={`Exercise completion over last ${timeWindow} days`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d5ea8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0d8b85" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#edf2f7" strokeDasharray="3 3" />
            <line x1={paddingX} y1={paddingY + graphHeight / 2} x2={width - paddingX} y2={paddingY + graphHeight / 2} stroke="#edf2f7" strokeDasharray="3 3" />
            <line x1={paddingX} y1={paddingY + graphHeight} x2={width - paddingX} y2={paddingY + graphHeight} stroke="#e2e8f0" />

            {/* Area Fill */}
            {areaString && (
              <polygon points={areaString} fill="url(#trendAreaGradient)" />
            )}

            {/* Polyline */}
            {pointsString && (
              <polyline
                points={pointsString}
                fill="none"
                stroke="#0d5ea8"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Circles */}
            {points.map((p, idx) => (
              <circle
                key={`${p.date}-${idx}`}
                cx={p.x}
                cy={p.y}
                r={p.value > 0 ? 4.5 : 2.5}
                fill={p.value > 0 ? '#0d5ea8' : '#cbd5e1'}
                stroke="#fff"
                strokeWidth="1.5"
              >
                <title>{`${p.label} (${p.date}): ${p.value} completed`}</title>
              </circle>
            ))}
          </svg>

          {/* X Axis Labels */}
          <div className="trend-axis-labels">
            <span>{points[0]?.label || ''}</span>
            {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label || ''}</span>}
            <span>{points[points.length - 1]?.label || ''}</span>
          </div>
        </div>
      ) : (
        <div className="trend-empty-state">
          <span className="empty-icon" aria-hidden="true">📊</span>
          <h4>No Completion Data in This Window</h4>
          <p>Complete scheduled exercises to view your performance curve over time.</p>
        </div>
      )}
    </section>
  )
}
