import React from 'react';
import styles from './Statistics.module.css';
import { STATUSES } from '../utils/applications';

/** Always summarises the user's full application list, regardless of active filters. */
function Statistics({ applications }) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let followUp = 0;
  applications.forEach((app) => {
    if (app.status in counts) counts[app.status] += 1;
    if (app.follow_up) followUp += 1;
  });

  return (
    <div className={styles.container}>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{applications.length}</div>
        <div className={styles.statLabel}>Total Applications</div>
      </div>
      {STATUSES.map((status) => (
        <div key={status} className={`${styles.statCard} ${styles[status.toLowerCase()] || ''}`}>
          <div className={styles.statValue}>{counts[status]}</div>
          <div className={styles.statLabel}>{status}</div>
        </div>
      ))}
      {followUp > 0 && (
        <div className={`${styles.statCard} ${styles.followUp}`}>
          <div className={styles.statValue}>{followUp}</div>
          <div className={styles.statLabel}>Follow Up</div>
        </div>
      )}
    </div>
  );
}

export default Statistics;
