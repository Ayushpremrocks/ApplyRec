import React from 'react';
import styles from './FilterBar.module.css';
import { STATUSES } from '../utils/applications';

const OPTIONS = [{ value: null, label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s }))];

function FilterBar({ selectedStatus, onFilterChange }) {
  return (
    <div className={styles.filterBar}>
      {OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value || 'all'}
          className={`${styles.filterButton} ${selectedStatus === option.value ? styles.active : ''}`}
          onClick={() => onFilterChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default FilterBar;
