import { useState, useEffect, useCallback } from 'react'
import PainJournalHistoryList from './PainJournalHistoryList'
import PainJournalFormModal from './PainJournalFormModal'

function getPainClass(val) {
  const n = Number(val)
  if (n === 0) return 'none'
  if (n <= 3) return 'mild'
  if (n <= 6) return 'moderate'
  return 'severe'
}

export default function PainJournalPage({ apiRequest }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  // Filter State
  const [bodyPartFilter, setBodyPartFilter] = useState('All')
  const [deletingId, setDeletingId] = useState(null)

  const loadJournal = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiRequest('/patients/me/pain-journal')
      setData(res)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load pain journal.')
    } finally {
      setLoading(false)
    }
  }, [apiRequest])

  useEffect(() => {
    loadJournal()
  }, [loadJournal])

  const handleOpenNew = () => {
    setEditingEntry(data?.todayEntry || null)
    setModalError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry)
    setModalError('')
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setEditingEntry(null)
      setModalError('')
    }
  }

  const handleSubmitEntry = async (formData) => {
    try {
      setSubmitting(true)
      setModalError('')

      if (formData.entryId) {
        // Edit existing entry
        await apiRequest(`/patients/me/pain-journal/${formData.entryId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
      } else {
        // Create or upsert today's entry
        await apiRequest('/patients/me/pain-journal', {
          method: 'POST',
          body: JSON.stringify(formData),
        })
      }

      setModalOpen(false)
      setEditingEntry(null)
      await loadJournal()
    } catch (err) {
      setModalError(err.message || 'Unable to save journal entry.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEntry = async (entryId) => {
    try {
      setDeletingId(entryId)
      await apiRequest(`/patients/me/pain-journal/${entryId}`, {
        method: 'DELETE',
      })
      await loadJournal()
    } catch (err) {
      alert(err.message || 'Failed to delete journal entry.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && !data) {
    return (
      <main className="page-shell">
        <div className="container management-wrap">
          <div className="loading-state-card">
            <div className="spinner-circle" />
            <p>Loading pain &amp; mobility journal...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="page-shell">
        <div className="container management-wrap">
          <div className="dashboard-error-card" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <h3>Unable to Load Journal</h3>
            <p>{error}</p>
            <button type="button" className="primary-btn" onClick={loadJournal}>
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  const entries = Array.isArray(data?.entries) ? data.entries : []
  const todayEntry = data?.todayEntry || null
  const summary = data?.summary || {}

  // Filter entries by body part
  const filteredEntries = bodyPartFilter === 'All'
    ? entries
    : entries.filter((e) => e.bodyPart === bodyPartFilter)

  const uniqueBodyParts = ['All', ...Array.from(new Set(entries.map((e) => e.bodyPart).filter(Boolean)))]

  return (
    <main className="page-shell pain-journal-page">
      <div className="container management-wrap pain-journal-wrap">
        {/* Page Hero */}
        <div className="management-heading journal-page-hero">
          <div>
            <span className="eyebrow accent">Rehabilitation Journal</span>
            <h2>Pain &amp; Mobility Journal</h2>
            <p>
              Log your daily discomfort, range of motion, and physical sensations to track your recovery trajectory and improve care alignment.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn log-today-btn"
            onClick={handleOpenNew}
          >
            {todayEntry ? '✏️ Update Today’s Check-in' : '+ Log Today’s Check-in'}
          </button>
        </div>

        {/* 3 Metric Tiles */}
        <div className="journal-kpi-grid">
          <div className="journal-kpi-card today-status">
            <span className="kpi-label">Today's Check-in</span>
            {todayEntry ? (
              <div className="kpi-today-body">
                <div className="kpi-score-badge-row">
                  <span className={`kpi-score-pill pain ${getPainClass(todayEntry.painLevel)}`}>
                    Pain: <strong>{todayEntry.painLevel}/10</strong>
                  </span>
                  <span className="kpi-score-pill mobility">
                    Mobility: <strong>{todayEntry.mobilityLevel}/5</strong>
                  </span>
                </div>
                <span className="kpi-sub-text">{todayEntry.bodyPart} • Recorded today</span>
              </div>
            ) : (
              <div className="kpi-today-pending">
                <span className="pending-pill">Awaiting Today's Entry</span>
                <span className="kpi-sub-text">Check in to keep your timeline current</span>
              </div>
            )}
          </div>

          <div className="journal-kpi-card">
            <span className="kpi-label">Average Pain Level</span>
            <div className="kpi-val-row">
              <strong className="kpi-val">{summary.averagePain !== null ? summary.averagePain : '--'}</strong>
              <span className="kpi-denom">/ 10</span>
            </div>
            <span className="kpi-sub-text">Across all logged check-ins</span>
          </div>

          <div className="journal-kpi-card">
            <span className="kpi-label">Average Mobility</span>
            <div className="kpi-val-row">
              <strong className="kpi-val">{summary.averageMobility !== null ? summary.averageMobility : '--'}</strong>
              <span className="kpi-denom">/ 5</span>
            </div>
            <span className="kpi-sub-text">{summary.totalEntries || 0} total entries logged</span>
          </div>
        </div>

        {/* Body Part Filter Row */}
        {entries.length > 0 && uniqueBodyParts.length > 2 && (
          <div className="journal-filter-row" role="tablist" aria-label="Filter by body part">
            <span className="filter-lead-label">Filter by Area:</span>
            <div className="filter-pills-wrap">
              {uniqueBodyParts.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  role="tab"
                  aria-selected={bodyPartFilter === bp}
                  className={`filter-pill-btn ${bodyPartFilter === bp ? 'active' : ''}`}
                  onClick={() => setBodyPartFilter(bp)}
                >
                  {bp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History Stream */}
        <section className="dashboard-card journal-history-panel" aria-labelledby="journal-history-heading">
          <div className="dashboard-card-heading">
            <span className="card-eyebrow">Audit Trail</span>
            <div className="journal-history-heading-row">
              <h3 id="journal-history-heading">Daily Recovery Timeline</h3>
              <span className="history-count-badge">
                <strong>{filteredEntries.length}</strong> {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>

          <PainJournalHistoryList
            entries={filteredEntries}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteEntry}
            onAddNew={handleOpenNew}
            deletingId={deletingId}
          />
        </section>

        {/* Modal Form */}
        {modalOpen && (
          <PainJournalFormModal
            initialEntry={editingEntry}
            onClose={handleCloseModal}
            onSubmit={handleSubmitEntry}
            submitting={submitting}
            error={modalError}
          />
        )}
      </div>
    </main>
  )
}
