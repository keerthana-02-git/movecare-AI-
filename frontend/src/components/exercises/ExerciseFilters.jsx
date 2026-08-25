export default function ExerciseFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  categories = [],
  counts = { all: 0, today: 0, completed: 0, pending: 0 },
}) {
  return (
    <div className="exercise-filter-bar" aria-label="Exercise filters">
      {/* Search Input */}
      <div className="filter-search-box">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="Search assigned exercises, body parts, or plans..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="exercise-search-input"
          aria-label="Search assigned exercises"
        />
        {search && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="filter-status-tabs" role="tablist" aria-label="Filter by schedule status">
        <button
          type="button"
          role="tab"
          aria-selected={selectedStatus === 'today'}
          className={`status-tab-btn ${selectedStatus === 'today' ? 'active' : ''}`}
          onClick={() => onStatusChange('today')}
        >
          Today&apos;s Schedule <span className="tab-count">{counts.today}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedStatus === 'all'}
          className={`status-tab-btn ${selectedStatus === 'all' ? 'active' : ''}`}
          onClick={() => onStatusChange('all')}
        >
          All Assigned <span className="tab-count">{counts.all}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedStatus === 'completed'}
          className={`status-tab-btn ${selectedStatus === 'completed' ? 'active' : ''}`}
          onClick={() => onStatusChange('completed')}
        >
          Completed Today <span className="tab-count">{counts.completed}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedStatus === 'pending'}
          className={`status-tab-btn ${selectedStatus === 'pending' ? 'active' : ''}`}
          onClick={() => onStatusChange('pending')}
        >
          Pending <span className="tab-count">{counts.pending}</span>
        </button>
      </div>

      {/* Category Dropdown */}
      {categories.length > 0 && (
        <div className="filter-category-select-wrap">
          <label htmlFor="category-select" className="sr-only">Filter by Category</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="category-dropdown-select"
          >
            <option value="all">All Categories ({counts.all})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
