import React from 'react';
import styles from './Statistics.module.css';
import { STATUSES, STATUS_VAR } from '../utils/applications';

/**
 * Counts for active (non-archived) applications. Each status tile is a filter shortcut.
 */
function Statistics({ applications, activeStatus, onSelectStatus }) {
  const active = applications.filter((a) => !a.archived);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let followUp = 0;
  active.forEach((app) => {
    if (app.status in counts) counts[app.status] += 1;
    if (app.follow_up) followUp += 1;
  });

  return (
    <div className={styles.container}>
      <div className={`${styles.stat} ${styles.total}`}>
        <span className={styles.value}>{active.length}</span>
        <span className={styles.label}>Total Applications</span>
      </div>
      {STATUSES.map((status) => (
        <button
          type="button"
          key={status}
          className={`${styles.stat} ${activeStatus === status ? styles.selected : ''}`}
          style={{ '--status': STATUS_VAR[status] }}
          aria-pressed={activeStatus === status}
          onClick={() => onSelectStatus?.(activeStatus === status ? null : status)}
        >
          <span className={styles.value}>{counts[status]}</span>
          <span className={styles.label}>
            <span className={styles.dot} aria-hidden="true" />
            {status}
          </span>
        </button>
      ))}
      {followUp > 0 && (
        <div className={`${styles.stat} ${styles.follow}`}>
          <span className={styles.value}>{followUp}</span>
          <span className={styles.label}>Follow Up</span>
        </div>
      )}
    </div>
  );
}

export default Statistics;
