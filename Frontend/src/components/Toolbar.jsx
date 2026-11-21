import React, { useId, useState } from 'react';
import styles from './Toolbar.module.css';
import { EMPTY_FILTERS, SORT_OPTIONS, STATUSES, countAdvancedFilters } from '../utils/applications';

const SOURCES = [
  { value: '', label: 'Any source' },
  { value: 'ON_CAMPUS', label: 'On-campus' },
  { value: 'OFF_CAMPUS', label: 'Off-campus' },
  { value: 'REFERRAL', label: 'Off-campus with referral' },
  { value: 'NONE', label: 'Not specified' },
];

/** Search, sort, view switch, status chips, active/archived switch and a collapsible filter panel. */
function Toolbar({ filters, onFiltersChange, sortBy, onSortChange, view, onViewChange, roles, tags, showArchived, onShowArchivedChange, archivedCount }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const advancedCount = countAdvancedFilters(filters);
  const set = (key) => (value) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <div className={styles.search}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor={`${uid}-search`} className="visually-hidden">
            Search applications
          </label>
          <input
            id={`${uid}-search`}
            type="search"
            className={styles.searchInput}
            placeholder="Search company, role or tag…"
            value={filters.search}
            onChange={(e) => set('search')(e.target.value)}
            enterKeyHint="search"
          />
        </div>

        <label className={styles.sort}>
          <span className="visually-hidden">Sort by</span>
          <select className={styles.select} value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.segmented} role="group" aria-label="View">
          {[
            { value: 'board', label: 'Board' },
            { value: 'list', label: 'List' },
          ].map((v) => (
            <button
              key={v.value}
              type="button"
              className={`${styles.segment} ${view === v.value ? styles.active : ''}`}
              aria-pressed={view === v.value}
              onClick={() => onViewChange(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.filterButton} ${open || advancedCount ? styles.filterOn : ''}`}
          aria-expanded={open}
          aria-controls={`${uid}-panel`}
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Filters
          {advancedCount > 0 && <span className={styles.badge}>{advancedCount}</span>}
        </button>
      </div>

      {open && (
        <div id={`${uid}-panel`} className={styles.panel}>
          <label className="field">
            <span className="field-label">Role</span>
            <select className="control" value={filters.role} onChange={(e) => set('role')(e.target.value)}>
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Tag</span>
            <select className="control" value={filters.tag} onChange={(e) => set('tag')(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Source</span>
            <select className="control" value={filters.source} onChange={(e) => set('source')(e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={`field ${styles.salary}`}>
            <legend className="field-label">Salary (LPA)</legend>
            <div className={styles.range}>
              <input
                className="control"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Min"
                aria-label="Minimum salary"
                value={filters.minSalary}
                onChange={(e) => set('minSalary')(e.target.value)}
              />
              <span aria-hidden="true">–</span>
              <input
                className="control"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Max"
                aria-label="Maximum salary"
                value={filters.maxSalary}
                onChange={(e) => set('maxSalary')(e.target.value)}
              />
            </div>
          </fieldset>
          <button
            type="button"
            className={styles.clear}
            disabled={advancedCount === 0}
            onClick={() => onFiltersChange({ ...EMPTY_FILTERS, search: filters.search, status: filters.status })}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className={styles.row2}>
        <div className={styles.chips} role="group" aria-label="Filter by status">
          {[null, ...STATUSES].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              className={`${styles.chip} ${filters.status === s ? styles.chipOn : ''}`}
              aria-pressed={filters.status === s}
              onClick={() => set('status')(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.archiveToggle} ${showArchived ? styles.chipOn : ''}`}
          aria-pressed={showArchived}
          onClick={() => onShowArchivedChange(!showArchived)}
        >
          {showArchived ? '← Back to active' : `Archived (${archivedCount})`}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
