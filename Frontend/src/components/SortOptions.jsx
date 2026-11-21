import React from 'react';
import styles from './SortOptions.module.css';
import { SORT_OPTIONS } from '../utils/applications';

function SortOptions({ sortBy, onSortChange }) {
  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="sort-by">
        Sort by:
      </label>
      <select
        id="sort-by"
        className={styles.select}
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SortOptions;
